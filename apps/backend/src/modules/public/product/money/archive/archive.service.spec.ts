import { describe, expect, it, vi } from 'vitest';

import { GoalKind, JarKey, PlanKey, type ArchiveRestorePayload } from '@rumtelo/contracts';

import { householdStorage } from '../../../../../common/household/household.context';
import { ArchiveService } from './archive.service';

const HOUSEHOLD = 'household-1';

const ORDER = [
    JarKey.NECESSITIES,
    JarKey.FINANCIAL_FREEDOM,
    JarKey.EDUCATION,
    JarKey.LONG_TERM_SAVINGS,
    JarKey.PLAY,
    JarKey.GIVE,
];

/** The household's own board: what `JarService.list` returns, in `sortOrder`. */
const LOCAL_JARS = ORDER.map((key, index) => ({
    id: `jar-${key}`,
    key,
    sortOrder: index,
    percentage: 10,
    // Education takes bills; Financial Freedom and Long-term savings do not.
    capabilities: {
        allowsFixedCosts: key !== JarKey.FINANCIAL_FREEDOM && key !== JarKey.LONG_TERM_SAVINGS,
    },
}));

function archiveJars(percentages: number[], keys: JarKey[] = ORDER) {
    return keys.map((key, index) => ({
        id: `export-${index}`,
        key,
        percentage: percentages[index] ?? 0,
    }));
}

function payloadWith(jars: ReturnType<typeof archiveJars>): ArchiveRestorePayload {
    return {
        // A settings patch proves the rest of the restore still runs around a bad split.
        settings: { why: 'restore me' },
        parties: [],
        accounts: [],
        jars,
        assets: [],
        income: [],
        fixedCosts: [],
        debts: [],
        goals: [],
        rules: [],
        transactions: [],
    };
}

function buildService() {
    const jars = {
        list: vi.fn<() => Promise<typeof LOCAL_JARS>>(async () => LOCAL_JARS),
        updateSplit: vi.fn<(split: unknown) => Promise<typeof LOCAL_JARS>>(async () => LOCAL_JARS),
    };
    const householdSettings = { update: vi.fn<() => Promise<void>>(async () => undefined) };
    const empty = { list: vi.fn<() => Promise<never[]>>(async () => []) };
    const service = new ArchiveService(
        { transactional: async (run: () => Promise<unknown>) => run() } as never,
        {
            planKeyForCurrentHousehold: vi.fn<() => Promise<PlanKey>>(async () => PlanKey.BASIC),
        } as never,
        jars as never,
        empty as never,
        empty as never,
        empty as never,
        empty as never,
        empty as never,
        empty as never,
        empty as never,
        householdSettings as never,
        { update: vi.fn<() => Promise<void>>() } as never
    );
    return { service, jars, householdSettings };
}

function restore(
    service: ArchiveService,
    payload: ArchiveRestorePayload,
    dryRun: boolean,
    applyJarSplit = true
) {
    return householdStorage.run(
        {
            userId: 'user-1',
            householdId: HOUSEHOLD,
            role: 'OWNER',
            source: 'SEAT' as never,
            relation: null,
        },
        () => service.restore({ payload, dryRun, applyJarSplit, applySettings: true })
    );
}

describe('ArchiveService.restore jar split', () => {
    it('applies a valid split in the real run', async () => {
        const { service, jars } = buildService();

        const result = await restore(
            service,
            payloadWith(archiveJars([50, 15, 10, 10, 10, 5])),
            false
        );

        expect(result.jarsSplitUpdated).toBe(true);
        expect(result.warnings).toEqual([]);
        expect(jars.updateSplit).toHaveBeenCalledWith(
            ORDER.map((key, index) => ({
                jarId: `jar-${key}`,
                percentage: [50, 15, 10, 10, 10, 5][index],
            }))
        );
    });

    it('previews a valid split in the dry run without writing it', async () => {
        const { service, jars } = buildService();

        const result = await restore(
            service,
            payloadWith(archiveJars([50, 15, 10, 10, 10, 5])),
            true
        );

        expect(result.jarsSplitUpdated).toBe(true);
        expect(result.warnings).toEqual([]);
        expect(jars.updateSplit).not.toHaveBeenCalled();
    });

    it.each([false, true])(
        'skips duplicate jar keys that still make six rows, with a warning (dryRun=%s)',
        async dryRun => {
            const { service, jars } = buildService();
            const keys = [...ORDER];
            keys[5] = JarKey.PLAY;

            const result = await restore(
                service,
                payloadWith(archiveJars([50, 15, 10, 10, 10, 5], keys)),
                dryRun
            );

            expect(result.jarsSplitUpdated).toBe(false);
            expect(result.warnings).toEqual(['jar_split_incomplete']);
            expect(jars.updateSplit).not.toHaveBeenCalled();
        }
    );

    it.each([false, true])('skips a split with a missing jar (dryRun=%s)', async dryRun => {
        const { service, jars } = buildService();

        const result = await restore(
            service,
            payloadWith(archiveJars([60, 40], [JarKey.NECESSITIES, JarKey.PLAY])),
            dryRun
        );

        expect(result.jarsSplitUpdated).toBe(false);
        expect(result.warnings).toEqual(['jar_split_incomplete']);
        expect(jars.updateSplit).not.toHaveBeenCalled();
    });

    it.each([false, true])(
        'rejects a total of 99.994, which the old 0.01 float tolerance let through (dryRun=%s)',
        async dryRun => {
            const { service, jars } = buildService();

            const result = await restore(
                service,
                payloadWith(archiveJars([55, 10, 10, 10, 10, 4.994])),
                dryRun
            );

            expect(result.jarsSplitUpdated).toBe(false);
            expect(result.warnings).toEqual(['jar_split_not_100']);
            expect(jars.updateSplit).not.toHaveBeenCalled();
        }
    );

    it.each([false, true])('skips an out-of-range share (dryRun=%s)', async dryRun => {
        const { service, jars } = buildService();

        const result = await restore(
            service,
            payloadWith(archiveJars([105, -5, 0, 0, 0, 0])),
            dryRun
        );

        expect(result.jarsSplitUpdated).toBe(false);
        expect(result.warnings).toEqual(['jar_split_not_100']);
        expect(jars.updateSplit).not.toHaveBeenCalled();
    });

    it('still restores the rest of the archive around a bad split', async () => {
        const { service, householdSettings } = buildService();

        const result = await restore(
            service,
            payloadWith(archiveJars([50, 10, 10, 10, 10, 5])),
            false
        );

        expect(result.warnings).toEqual(['jar_split_not_100']);
        expect(result.settings.willImport).toBe(1);
        expect(householdSettings.update).toHaveBeenCalledTimes(1);
    });

    it('leaves the split alone when applyJarSplit is off or the archive has no jars', async () => {
        const { service, jars } = buildService();

        const off = await restore(
            service,
            payloadWith(archiveJars([50, 15, 10, 10, 10, 5])),
            false,
            false
        );
        const none = await restore(service, payloadWith([]), false);

        expect(off.jarsSplitUpdated).toBe(false);
        expect(none.jarsSplitUpdated).toBe(false);
        expect(off.warnings).toEqual([]);
        expect(none.warnings).toEqual([]);
        expect(jars.updateSplit).not.toHaveBeenCalled();
    });

    it('reports the same outcome in the dry run and the real run', async () => {
        const cases = [
            archiveJars([50, 15, 10, 10, 10, 5]),
            archiveJars([55, 10, 10, 10, 10, 4.994]),
            archiveJars([50, 15, 10, 10, 10, 5], [...ORDER.slice(0, 5), JarKey.PLAY]),
        ];
        const outcomes = await Promise.all(
            cases.map(async jarRows => ({
                dry: await restore(buildService().service, payloadWith(jarRows), true),
                real: await restore(buildService().service, payloadWith(jarRows), false),
            }))
        );
        for (const { dry, real } of outcomes) {
            expect(dry.jarsSplitUpdated).toBe(real.jarsSplitUpdated);
            expect(dry.warnings).toEqual(real.warnings);
        }
    });
});

/**
 * A household with only the three main pots restoring a six-pot export: rows that point at a
 * pot it has not turned on land in that group's main pot, not nowhere.
 */
describe('ArchiveService.restore into a three-pot household', () => {
    const MAIN_ONLY = [JarKey.NECESSITIES, JarKey.LONG_TERM_SAVINGS, JarKey.PLAY];
    const THREE_POTS = MAIN_ONLY.map((key, index) => ({
        id: `jar-${key}`,
        key,
        sortOrder: index,
        percentage: [55, 20, 25][index]!,
        capabilities: { allowsFixedCosts: key !== JarKey.LONG_TERM_SAVINGS },
    }));
    const exportJarId = (key: JarKey) => `export-${ORDER.indexOf(key)}`;

    function build() {
        const created = {
            fixedCosts: [] as Array<{ jarId: string; name: string }>,
            rules: [] as Array<{ jarId: string }>,
            goals: [] as Array<{ jarId: string | null; kind?: GoalKind }>,
        };
        const list = vi.fn<() => Promise<never[]>>(async () => []);
        const service = new ArchiveService(
            {
                find: async () => [],
                transactional: async (run: () => Promise<unknown>) => run(),
            } as never,
            {
                planKeyForCurrentHousehold: async () => PlanKey.MAX,
                assertWithinLimit: async () => {},
            } as never,
            { list: async () => THREE_POTS, updateSplit: vi.fn<() => Promise<void>>() } as never,
            { list } as never,
            { list } as never,
            {
                list,
                create: async (row: { jarId: string; name: string }) => {
                    created.fixedCosts.push(row);
                    return { id: 'fixed-1', ...row };
                },
            } as never,
            { list } as never,
            {
                list,
                create: async (row: { jarId: string | null; kind?: GoalKind }) => {
                    created.goals.push(row);
                    return { id: 'goal-1', ...row };
                },
            } as never,
            {
                list,
                create: async (row: { jarId: string }) => {
                    created.rules.push(row);
                    return { id: 'rule-1', ...row };
                },
            } as never,
            { list } as never,
            { update: vi.fn<() => Promise<void>>() } as never,
            { update: vi.fn<() => Promise<void>>() } as never
        );
        return { service, created };
    }

    it('puts rules and bills of a pot that is off into the group main pot', async () => {
        const { service, created } = build();
        const payload = {
            ...payloadWith(archiveJars([50, 15, 10, 10, 10, 5])),
            rules: [
                {
                    field: 'DESCRIPTION',
                    matcher: 'CONTAINS',
                    matchValue: 'donation',
                    jarId: exportJarId(JarKey.GIVE),
                },
                {
                    field: 'DESCRIPTION',
                    matcher: 'CONTAINS',
                    matchValue: 'fund',
                    jarId: exportJarId(JarKey.FINANCIAL_FREEDOM),
                },
            ],
            fixedCosts: [
                { name: 'Gym', amount: 30_00, jarId: exportJarId(JarKey.GIVE) },
                { name: 'Course', amount: 50_00, jarId: exportJarId(JarKey.EDUCATION) },
            ],
        } as unknown as ArchiveRestorePayload;

        const result = await restore(service, payload, false);

        expect(created.rules.map(row => row.jarId)).toEqual([
            `jar-${JarKey.PLAY}`,
            `jar-${JarKey.LONG_TERM_SAVINGS}`,
        ]);
        // Gym -> Play takes bills; Course -> Long-term savings does not, so it is skipped with
        // a warning rather than aborting the half-applied restore.
        expect(created.fixedCosts).toEqual([
            expect.objectContaining({ name: 'Gym', jarId: `jar-${JarKey.PLAY}` }),
        ]);
        expect(result.fixedCosts).toMatchObject({ willImport: 1, skipped: 1 });
        expect(result.warnings).toContain('fixed_cost_jar_unmapped');
    });

    it('skips a Give pledge without a Give pot (never points it at Play) and restores the rest', async () => {
        const { service, created } = build();
        const payload = {
            ...payloadWith(archiveJars([50, 15, 10, 10, 10, 5])),
            goals: [
                {
                    name: 'Pledge',
                    kind: GoalKind.GIVE,
                    target: 100_00,
                    jarId: exportJarId(JarKey.GIVE),
                },
                {
                    name: 'Pledge on Play',
                    kind: GoalKind.GIVE,
                    target: 100_00,
                    jarId: exportJarId(JarKey.PLAY),
                },
                {
                    name: 'Savings',
                    kind: GoalKind.SAVE,
                    target: 100_00,
                    jarId: exportJarId(JarKey.EDUCATION),
                },
            ],
        } as unknown as ArchiveRestorePayload;

        const result = await restore(service, payload, false);

        expect(created.goals.map(row => row.jarId)).toEqual([`jar-${JarKey.LONG_TERM_SAVINGS}`]);
        expect(result.goals).toMatchObject({ willImport: 1, skipped: 2 });
        expect(result.warnings).toContain('goal_give_pot_missing');
    });

    it('skips the split with the existing warning when the key sets differ', async () => {
        const { service } = build();

        const result = await restore(
            service,
            payloadWith(archiveJars([50, 15, 10, 10, 10, 5])),
            false
        );

        expect(result.jarsSplitUpdated).toBe(false);
        expect(result.warnings).toEqual(['jar_split_incomplete']);
    });
});
