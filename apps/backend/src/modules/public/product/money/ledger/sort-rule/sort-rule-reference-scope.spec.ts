import { describe, expect, it, vi } from 'vitest';

import {
    asOwnerOf,
    fakeHouseholdEm,
    HOUSEHOLD_A,
    notFound,
    type Row,
} from '../../fake-household-em.testing';
import { SortRule } from './sort-rule.entity';
import { SortRuleService } from './sort-rule.service';

/**
 * A rule points at a pot and a category the client names. Both must be this household's:
 * a foreign id is refused and the rule is neither created nor changed.
 */

function ruleRow(overrides: Partial<Row> = {}): Row {
    return {
        id: 'rule-a1',
        household: HOUSEHOLD_A,
        field: 'COUNTERPARTY',
        matcher: 'CONTAINS',
        matchValue: 'albert',
        jar: { id: 'jar-a-necessities' },
        category: null,
        priority: 100,
        isActive: true,
        hitCount: 0,
        ...overrides,
    };
}

function setup(rules: Row[] = []) {
    const em = fakeHouseholdEm();
    em.tables.set(SortRule, rules);
    const service = new SortRuleService(
        em as never,
        { listActive: vi.fn<() => Promise<never[]>>(async () => []) } as never
    );
    return { em, service };
}

const input = (overrides: Record<string, unknown>) => ({
    field: 'COUNTERPARTY',
    matcher: 'CONTAINS',
    matchValue: 'coffee',
    jarId: 'jar-a-play',
    ...overrides,
});

describe('SortRuleService.create', () => {
    it.each([
        ['jar', { jarId: 'jar-b-play' }, 'jar_not_found'],
        ['category', { categoryId: 'category-b' }, 'category_not_found'],
    ])('refuses a foreign %s and writes nothing', async (_label, ids, key) => {
        const { em, service } = setup();

        await expect(asOwnerOf(HOUSEHOLD_A, () => service.create(input(ids)))).rejects.toEqual(
            notFound(key)
        );

        expect(em.create).not.toHaveBeenCalled();
        expect(em.flush).not.toHaveBeenCalled();
        expect(em.getReference).not.toHaveBeenCalled();
    });

    it('creates a rule on the own pot and category', async () => {
        const { em, service } = setup();

        const rule = await asOwnerOf(HOUSEHOLD_A, () =>
            service.create(input({ categoryId: 'category-a' }))
        );

        expect(rule).toMatchObject({ jarId: 'jar-a-play', categoryId: 'category-a' });
        expect(em.flush).toHaveBeenCalled();
    });
});

describe('SortRuleService.update', () => {
    it.each([
        ['jar', { jarId: 'jar-b-play' }, 'jar_not_found'],
        ['category', { categoryId: 'category-b' }, 'category_not_found'],
    ])('refuses a foreign %s and leaves the rule as it was', async (_label, patch, key) => {
        const row = ruleRow();
        const { em, service } = setup([row]);

        await expect(
            asOwnerOf(HOUSEHOLD_A, () =>
                service.update(row.id, { matchValue: 'changed', ...patch })
            )
        ).rejects.toEqual(notFound(key));

        expect(row).toMatchObject({
            matchValue: 'albert',
            jar: { id: 'jar-a-necessities' },
            category: null,
        });
        expect(em.flush).not.toHaveBeenCalled();
    });

    it('moves the rule to the own pot and category', async () => {
        const row = ruleRow();
        const { service } = setup([row]);

        const rule = await asOwnerOf(HOUSEHOLD_A, () =>
            service.update(row.id, { jarId: 'jar-a-play', categoryId: 'category-a' })
        );

        expect(rule).toMatchObject({ jarId: 'jar-a-play', categoryId: 'category-a' });
    });
});

describe('SortRuleService.upsertPayeeHint', () => {
    const hint = (overrides: Record<string, unknown>) => ({
        field: 'COUNTERPARTY' as const,
        matchValue: 'albert',
        jarId: 'jar-a-play',
        explicit: true,
        ...overrides,
    });

    it('refuses a foreign pot on an existing payee rule and leaves it untouched', async () => {
        const row = ruleRow();
        const { em, service } = setup([row]);

        await expect(
            asOwnerOf(HOUSEHOLD_A, () => service.upsertPayeeHint(hint({ jarId: 'jar-b-play' })))
        ).rejects.toEqual(notFound('jar_not_found'));

        expect(row.jar).toEqual({ id: 'jar-a-necessities' });
        expect(em.flush).not.toHaveBeenCalled();
    });

    it('refuses a foreign pot when it would create the payee rule', async () => {
        const { em, service } = setup();

        await expect(
            asOwnerOf(HOUSEHOLD_A, () => service.upsertPayeeHint(hint({ jarId: 'jar-b-play' })))
        ).rejects.toEqual(notFound('jar_not_found'));

        expect(em.create).not.toHaveBeenCalled();
    });

    it('re-points an existing payee rule to the own pot', async () => {
        const row = ruleRow();
        const { service } = setup([row]);

        const rule = await asOwnerOf(HOUSEHOLD_A, () => service.upsertPayeeHint(hint({})));

        expect(rule).toMatchObject({ jarId: 'jar-a-play' });
    });
});
