import { describe, expect, it, vi } from 'vitest';

import { BoardStage, Currency, PlanKey } from '@rumtelo/contracts';

import { HouseholdSettings } from './household-settings.entity';
import { HouseholdSettingsService } from './household-settings.service';

type Row = { household: string; boardStageFloor: BoardStage | null; [key: string]: unknown };

/** Settings rows keyed by household id; `create` registers a row like the real entity manager. */
function setup(rows: Record<string, Row>, planKey = PlanKey.BASIC) {
    const em = {
        findOne: vi.fn<(entity: unknown, where: { household: string }) => Promise<Row | null>>(
            async (entity, where) =>
                entity === HouseholdSettings ? (rows[where.household] ?? null) : null
        ),
        find: vi.fn<() => Promise<unknown[]>>(async () => []),
        create: vi.fn<(entity: unknown, data: Row) => Row>((_entity, data) => {
            const row = {
                audiences: { getItems: () => [] },
                ...data,
                boardStageFloor: data.boardStageFloor ?? null,
            };
            rows[data.household] = row;
            return row;
        }),
        persist: vi.fn<(row: unknown) => { flush: () => Promise<void> }>(() => ({
            flush: async () => {},
        })),
        flush: vi.fn<() => Promise<void>>(async () => {}),
    };
    const billing = {
        getPlanKey: async () => planKey,
        setPlanKey: vi.fn<(householdId: string, plan: PlanKey) => Promise<void>>(async () => {}),
        getSnapshot: async () => ({ extraContributorSeats: 0, extraViewerSeats: 0 }),
        // The settings service owns no billing rows: create() hands the plan to em.create.
    };
    const config = { get: () => true };
    const service = new HouseholdSettingsService(em as never, config as never, billing as never);
    return { service, em, rows, billing };
}

const row = (household: string, boardStageFloor: BoardStage | null = null): Row => ({
    household,
    boardStageFloor,
    audiences: { getItems: () => [] },
});

describe('HouseholdSettingsService.raiseBoardStageFloor', () => {
    it('raises a null floor to MONTH', async () => {
        const { service, rows } = setup({ 'household-a': row('household-a') });
        await service.raiseBoardStageFloor('household-a', BoardStage.MONTH);
        expect(rows['household-a']?.boardStageFloor).toBe(BoardStage.MONTH);
    });

    it('never lowers a floor', async () => {
        const { service, rows } = setup({ 'household-a': row('household-a', BoardStage.MONTH) });
        await service.raiseBoardStageFloor('household-a', BoardStage.ROUTINE);
        expect(rows['household-a']?.boardStageFloor).toBe(BoardStage.MONTH);
    });

    it('creates the settings row when the household has none', async () => {
        const { service, rows } = setup({});
        await service.raiseBoardStageFloor('household-a', BoardStage.MONTH);
        expect(rows['household-a']?.boardStageFloor).toBe(BoardStage.MONTH);
    });

    it('only touches the household it is given', async () => {
        const { service, rows } = setup({
            'household-a': row('household-a'),
            'household-b': row('household-b'),
        });
        await service.raiseBoardStageFloor('household-a', BoardStage.MONTH);
        expect(rows['household-b']?.boardStageFloor).toBeNull();
    });
});

describe('HouseholdSettingsService.update (plan change)', () => {
    it('writes the MONTH floor when the household upgrades to Plus', async () => {
        const { service, rows, billing } = setup({ 'household-a': row('household-a') });
        await service.update('household-a', { planKey: PlanKey.PLUS });
        expect(billing.setPlanKey).toHaveBeenCalledWith('household-a', PlanKey.PLUS);
        expect(rows['household-a']?.boardStageFloor).toBe(BoardStage.MONTH);
    });

    it('keeps the floor on a downgrade to Basic', async () => {
        const { service, rows } = setup(
            { 'household-a': row('household-a', BoardStage.MONTH) },
            PlanKey.PLUS
        );
        await service.update('household-a', { planKey: PlanKey.BASIC });
        expect(rows['household-a']?.boardStageFloor).toBe(BoardStage.MONTH);
    });

    it('does not set a floor when a Basic household stays on Basic', async () => {
        const { service, rows } = setup({ 'household-a': row('household-a') });
        await service.update('household-a', { why: 'a roof' });
        expect(rows['household-a']?.boardStageFloor).toBeNull();
    });
});

describe('HouseholdSettingsService.create (onboarding)', () => {
    const input = (planKey: PlanKey) => ({
        householdId: 'household-a',
        planKey,
        currency: Currency.EUR,
        why: null,
        money: {},
    });

    it('a household that starts on Plus is created with the MONTH floor', () => {
        const { service, em } = setup({});
        service.create(input(PlanKey.PLUS));
        expect(em.create).toHaveBeenCalledWith(
            HouseholdSettings,
            expect.objectContaining({ boardStageFloor: BoardStage.MONTH })
        );
    });

    it('a Basic household is created with no floor and walks the ladder', () => {
        const { service, em } = setup({});
        service.create(input(PlanKey.BASIC));
        expect(em.create).toHaveBeenCalledWith(
            HouseholdSettings,
            expect.objectContaining({ boardStageFloor: null })
        );
    });
});
