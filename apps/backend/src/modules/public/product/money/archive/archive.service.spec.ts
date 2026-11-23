import { describe, expect, it, vi } from 'vitest';

import { JarKey, PlanKey, type ArchiveRestorePayload } from '@rumtelo/contracts';

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
        {} as never,
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
