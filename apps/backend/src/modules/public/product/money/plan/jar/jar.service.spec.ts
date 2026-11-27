import { BadRequestException } from '@nestjs/common';
import { LockMode } from '@mikro-orm/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { JarKey } from '@rumtelo/contracts';

import { householdStorage } from '../../../../../../common/household/household.context';
import type { Jar } from './jar.entity';
import { JAR_SHARE_BASELINE_PERIOD, JarShare } from './jar-share.entity';
import { JarService } from './jar.service';

/** "This month" for every write in this spec. */
const NOW = '2026-11';

beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-23T10:00:00Z'));
});
afterEach(() => vi.useRealTimers());

const HOUSEHOLD = 'household-1';
const OTHER_HOUSEHOLD = 'household-2';

/** The default board, in stored `sortOrder`, as the seeded catalog creates it. */
const DEFAULT_BOARD: Array<[JarKey, string]> = [
    [JarKey.NECESSITIES, '55.00'],
    [JarKey.FINANCIAL_FREEDOM, '10.00'],
    [JarKey.EDUCATION, '10.00'],
    [JarKey.LONG_TERM_SAVINGS, '10.00'],
    [JarKey.PLAY, '10.00'],
    [JarKey.GIVE, '5.00'],
];

function buildJars(household: string, board: Array<[JarKey, string]> = DEFAULT_BOARD): Jar[] {
    return board.map(
        ([key, percentage], index) =>
            ({
                id: `${household}-${key}`,
                household,
                key,
                percentage,
                sortOrder: index,
            }) as unknown as Jar
    );
}

type ShareRow = { household: string; jar: { id: string }; period: string; percentage: string };

/** The baseline row the migration wrote for every pot that existed when the table was made. */
function baselineShares(jars: Jar[]): ShareRow[] {
    return jars.map(jar => ({
        household: (jar as unknown as { household: string }).household,
        jar: { id: jar.id },
        period: JAR_SHARE_BASELINE_PERIOD,
        percentage: jar.percentage,
    }));
}

/**
 * The scoped repository injects `household` into the filter, so the fake `em.find`
 * honours it exactly like Postgres would: a foreign household's jars are invisible.
 * Share rows live in their own list; `withShareHistory: false` leaves the household's pots
 * with no share rows at all (the deploy-window case).
 */
function buildService(
    householdBoard: Array<[JarKey, string]> = DEFAULT_BOARD,
    options: { withShareHistory?: boolean } = {}
) {
    const householdJars = buildJars(HOUSEHOLD, householdBoard);
    const otherJars = buildJars(OTHER_HOUSEHOLD);
    const rows = [...householdJars, ...otherJars];
    const shares: ShareRow[] = [
        ...(options.withShareHistory === false ? [] : baselineShares(householdJars)),
        ...baselineShares(otherJars),
    ];
    const flush = vi.fn<() => Promise<void>>(async () => undefined);
    const em = {
        find: vi.fn<
            (
                entity: unknown,
                where: { household: string },
                options?: { lockMode?: LockMode; orderBy?: unknown }
            ) => Promise<Jar[]>
        >(async (entity, where) =>
            (entity === JarShare ? (shares as unknown as Jar[]) : rows).filter(
                row => (row as unknown as { household: string }).household === where.household
            )
        ),
        create: vi.fn<(entity: unknown, data: ShareRow) => ShareRow>((_entity, data) => ({
            ...data,
        })),
        persist: vi.fn<(row: ShareRow) => void>(row => {
            shares.push(row);
        }),
        remove: vi.fn<(row: ShareRow) => void>(),
        flush,
        transactional: undefined as unknown as <T>(cb: (tx: unknown) => Promise<T>) => Promise<T>,
    };
    // `updateSplit` runs inside a transaction; the fake runs the callback on the same em.
    em.transactional = cb => cb(em);
    const service = new JarService(em as never, {} as never, {} as never, {} as never);
    vi.spyOn(service, 'list').mockResolvedValue([]);
    return { service, rows, shares, flush, em };
}

function inHousehold<T>(run: () => Promise<T>): Promise<T> {
    return householdStorage.run(
        {
            userId: 'user-1',
            householdId: HOUSEHOLD,
            role: 'OWNER',
            source: 'SEAT' as never,
            relation: null,
        },
        run
    );
}

function fullSplit(percentages: number[]) {
    return DEFAULT_BOARD.map(([key], index) => ({
        jarId: `${HOUSEHOLD}-${key}`,
        percentage: percentages[index]!,
    }));
}

function percentagesOf(rows: Jar[], household: string) {
    return rows
        .filter(row => (row as unknown as { household: string }).household === household)
        .map(row => row.percentage);
}

describe('JarService.updateSplit', () => {
    it('stores a complete split that totals 100', async () => {
        const { service, rows, flush } = buildService();

        await inHousehold(() => service.updateSplit(fullSplit([50, 15, 10, 10, 10, 5])));

        expect(percentagesOf(rows, HOUSEHOLD)).toEqual([
            '50.00',
            '15.00',
            '10.00',
            '10.00',
            '10.00',
            '5.00',
        ]);
        expect(flush).toHaveBeenCalledTimes(1);
    });

    it('accepts half-percent steps as the settings slider sends them', async () => {
        const { service, rows } = buildService();

        await inHousehold(() => service.updateSplit(fullSplit([52.5, 12.5, 10, 10, 10, 5])));

        expect(percentagesOf(rows, HOUSEHOLD)[0]).toBe('52.50');
        expect(percentagesOf(rows, HOUSEHOLD)[1]).toBe('12.50');
    });

    it('rejects a partial payload that sums to 100 with jar_split_keys and writes nothing', async () => {
        const { service, rows, flush } = buildService();
        const partial = [
            { jarId: `${HOUSEHOLD}-${JarKey.NECESSITIES}`, percentage: 60 },
            { jarId: `${HOUSEHOLD}-${JarKey.PLAY}`, percentage: 40 },
        ];

        await expect(inHousehold(() => service.updateSplit(partial))).rejects.toMatchObject({
            response: expect.objectContaining({ message: 'jar_split_keys' }),
        });
        expect(percentagesOf(rows, HOUSEHOLD)).toEqual(DEFAULT_BOARD.map(([, value]) => value));
        expect(flush).not.toHaveBeenCalled();
    });

    it('rejects a duplicated jar with jar_split_keys', async () => {
        const { service, flush } = buildService();
        const split = fullSplit([50, 15, 10, 10, 10, 5]);
        split[5] = { ...split[0]!, percentage: 5 };

        await expect(inHousehold(() => service.updateSplit(split))).rejects.toMatchObject({
            response: expect.objectContaining({ message: 'jar_split_keys' }),
        });
        expect(flush).not.toHaveBeenCalled();
    });

    it.each([
        ['under', [50, 10, 10, 10, 10, 5], 95],
        ['over', [55, 10, 10, 10, 10, 10], 105],
        ['a hundredth off', [55, 10, 10, 10, 10, 4.99], 99.99],
    ])(
        'rejects a total that is %s 100 with jar_split_total',
        async (_label, percentages, total) => {
            const { service, flush } = buildService();

            await expect(
                inHousehold(() => service.updateSplit(fullSplit(percentages)))
            ).rejects.toMatchObject({
                response: expect.objectContaining({
                    message: 'jar_split_total',
                    params: { total },
                }),
            });
            expect(flush).not.toHaveBeenCalled();
        }
    );

    it('rejects a jar id from another household with jar_split_keys and leaves it untouched', async () => {
        const { service, rows, flush } = buildService();
        const split = fullSplit([50, 15, 10, 10, 10, 5]);
        split[0] = { jarId: `${OTHER_HOUSEHOLD}-${JarKey.NECESSITIES}`, percentage: 50 };

        await expect(inHousehold(() => service.updateSplit(split))).rejects.toMatchObject({
            response: expect.objectContaining({ message: 'jar_split_keys' }),
        });
        expect(percentagesOf(rows, OTHER_HOUSEHOLD)).toEqual(
            DEFAULT_BOARD.map(([, value]) => value)
        );
        expect(flush).not.toHaveBeenCalled();
    });

    it('rejects an unknown jar id with jar_split_keys', async () => {
        const { service } = buildService();
        const split = fullSplit([50, 15, 10, 10, 10, 5]);
        split[2] = { jarId: 'does-not-exist', percentage: 10 };

        await expect(inHousehold(() => service.updateSplit(split))).rejects.toMatchObject({
            response: expect.objectContaining({ message: 'jar_split_keys' }),
        });
    });
});

/**
 * QA additions (SP-4a): boundaries the first spec leaves open — a hundredth over, a
 * household with fewer than six jars, an empty household, and the status class of every
 * rejection (always a 400, never a 500).
 */
describe('JarService.updateSplit edge cases', () => {
    it('rejects a total a hundredth over 100 with jar_split_total', async () => {
        const { service, flush } = buildService();

        await expect(
            inHousehold(() => service.updateSplit(fullSplit([55, 10, 10, 10, 10, 5.01])))
        ).rejects.toMatchObject({
            response: expect.objectContaining({
                message: 'jar_split_total',
                params: { total: 100.01 },
            }),
        });
        expect(flush).not.toHaveBeenCalled();
    });

    it('accepts thirds that total 100 in basis points (33.33 / 33.33 / 33.34)', async () => {
        const { service, rows } = buildService([
            [JarKey.NECESSITIES, '50.00'],
            [JarKey.PLAY, '30.00'],
            [JarKey.GIVE, '20.00'],
        ]);

        await inHousehold(() =>
            service.updateSplit([
                { jarId: `${HOUSEHOLD}-${JarKey.NECESSITIES}`, percentage: 33.33 },
                { jarId: `${HOUSEHOLD}-${JarKey.PLAY}`, percentage: 33.33 },
                { jarId: `${HOUSEHOLD}-${JarKey.GIVE}`, percentage: 33.34 },
            ])
        );

        expect(percentagesOf(rows, HOUSEHOLD)).toEqual(['33.33', '33.33', '33.34']);
    });

    it('validates against the jars the household actually has, not a fixed six', async () => {
        const fiveJars: Array<[JarKey, string]> = DEFAULT_BOARD.filter(
            ([key]) => key !== JarKey.GIVE
        ).map(([key, percentage]) => [key, key === JarKey.PLAY ? '15.00' : percentage]);
        const { service, rows, flush } = buildService(fiveJars);
        const fiveSplit = fiveJars.map(([key], index) => ({
            jarId: `${HOUSEHOLD}-${key}`,
            percentage: [50, 15, 15, 10, 10][index]!,
        }));

        await inHousehold(() => service.updateSplit(fiveSplit));
        expect(percentagesOf(rows, HOUSEHOLD)).toEqual([
            '50.00',
            '15.00',
            '15.00',
            '10.00',
            '10.00',
        ]);
        expect(flush).toHaveBeenCalledTimes(1);

        // Four of five jars, even at 100 in total, leaves a jar out.
        await expect(
            inHousehold(() =>
                service.updateSplit(
                    fiveSplit.slice(0, 4).map((entry, index) => ({
                        ...entry,
                        percentage: [55, 15, 15, 15][index]!,
                    }))
                )
            )
        ).rejects.toMatchObject({
            response: expect.objectContaining({ message: 'jar_split_keys' }),
        });
        expect(flush).toHaveBeenCalledTimes(1);
    });

    it('rejects every payload for a household with no jars, as a 400', async () => {
        const { service, flush } = buildService([]);

        const withEntry = inHousehold(() =>
            service.updateSplit([{ jarId: `${HOUSEHOLD}-${JarKey.PLAY}`, percentage: 100 }])
        );
        await expect(withEntry).rejects.toMatchObject({
            response: expect.objectContaining({ message: 'jar_split_keys' }),
        });
        // An empty payload is blocked by the contract (`min(1)`); the service still answers 400.
        await expect(inHousehold(() => service.updateSplit([]))).rejects.toBeInstanceOf(
            BadRequestException
        );
        expect(flush).not.toHaveBeenCalled();
    });

    it('answers every rejection with a 400, never a 500', async () => {
        const { service } = buildService();
        const duplicate = fullSplit([50, 15, 10, 10, 10, 5]);
        duplicate[5] = { ...duplicate[0]!, percentage: 5 };
        const attempts = [
            fullSplit([50, 10, 10, 10, 10, 5]),
            duplicate,
            [{ jarId: 'does-not-exist', percentage: 100 }],
            [{ jarId: `${OTHER_HOUSEHOLD}-${JarKey.NECESSITIES}`, percentage: 100 }],
        ];

        for (const attempt of attempts) {
            const outcome = await inHousehold(() => service.updateSplit(attempt)).catch(
                (error: unknown) => error
            );
            expect(outcome).toBeInstanceOf(BadRequestException);
            expect((outcome as BadRequestException).getStatus()).toBe(400);
        }
    });

    it('writes nothing when the total is off, even if most rows are valid', async () => {
        const { service, rows } = buildService();

        await inHousehold(() => service.updateSplit(fullSplit([60, 10, 10, 10, 10, 5]))).catch(
            () => undefined
        );

        expect(percentagesOf(rows, HOUSEHOLD)).toEqual(DEFAULT_BOARD.map(([, value]) => value));
    });
});

describe('JarService.updateSplit lock', () => {
    it('locks every jar of the household in id order before validating, like activate and deactivate', async () => {
        const { service, em } = buildService();

        await inHousehold(() => service.updateSplit(fullSplit([50, 15, 10, 10, 10, 5])));

        const jarFinds = em.find.mock.calls.filter(([entity]) => entity !== JarShare);
        expect(jarFinds).toHaveLength(1);
        const [, where, options] = jarFinds[0]!;
        expect(where).toEqual({ household: HOUSEHOLD });
        expect(options).toMatchObject({
            orderBy: { id: 'ASC' },
            lockMode: LockMode.PESSIMISTIC_WRITE,
        });
    });

    it('rejects a split built from a stale board (a jar id that is no longer there) with jar_split_keys', async () => {
        // The client saw six jars; a concurrent turn-off removed one before this write got the lock.
        const { service, rows, flush } = buildService([
            [JarKey.NECESSITIES, '60.00'],
            [JarKey.LONG_TERM_SAVINGS, '20.00'],
            [JarKey.PLAY, '20.00'],
        ]);
        const stale = fullSplit([55, 10, 10, 10, 10, 5]);

        await expect(inHousehold(() => service.updateSplit(stale))).rejects.toMatchObject({
            response: expect.objectContaining({ message: 'jar_split_keys' }),
        });
        expect(percentagesOf(rows, HOUSEHOLD)).toEqual(['60.00', '20.00', '20.00']);
        expect(flush).not.toHaveBeenCalled();
    });

    it('rejects a split that is missing a jar that appeared meanwhile with jar_split_keys', async () => {
        const { service, flush } = buildService();
        // Client board has five of the six jars the locked set holds.
        const missingOne = fullSplit([55, 10, 10, 10, 10, 5]).slice(0, 5);

        await expect(inHousehold(() => service.updateSplit(missingOne))).rejects.toMatchObject({
            response: expect.objectContaining({ message: 'jar_split_keys' }),
        });
        expect(flush).not.toHaveBeenCalled();
    });
});

/**
 * Share history (SP3-H): a split change writes this month's row, never an earlier one, so a
 * later balance read keeps every past month at the share it had.
 */
describe('JarService.updateSplit share history', () => {
    const shareOf = (shares: ShareRow[], key: JarKey, period: string) =>
        shares.find(row => row.jar.id === `${HOUSEHOLD}-${key}` && row.period === period);

    it('writes this month for the pots that changed and leaves every other pot and month alone', async () => {
        const { service, shares } = buildService();

        await inHousehold(() => service.updateSplit(fullSplit([50, 15, 10, 10, 10, 5])));

        const ofHousehold = shares.filter(row => row.household === HOUSEHOLD);
        expect(ofHousehold.filter(row => row.period === NOW).map(row => row.jar.id)).toEqual([
            `${HOUSEHOLD}-${JarKey.NECESSITIES}`,
            `${HOUSEHOLD}-${JarKey.FINANCIAL_FREEDOM}`,
        ]);
        expect(shareOf(shares, JarKey.NECESSITIES, NOW)!.percentage).toBe('50.00');
        expect(shareOf(shares, JarKey.FINANCIAL_FREEDOM, NOW)!.percentage).toBe('15.00');
        // The baseline (the past) is untouched.
        expect(shareOf(shares, JarKey.NECESSITIES, JAR_SHARE_BASELINE_PERIOD)!.percentage).toBe(
            '55.00'
        );
        expect(ofHousehold).toHaveLength(8);
    });

    it('overwrites the same month on a second change instead of adding a row', async () => {
        const { service, shares } = buildService();

        await inHousehold(() => service.updateSplit(fullSplit([50, 15, 10, 10, 10, 5])));
        await inHousehold(() => service.updateSplit(fullSplit([45, 20, 10, 10, 10, 5])));

        const necessities = shares.filter(
            row => row.jar.id === `${HOUSEHOLD}-${JarKey.NECESSITIES}`
        );
        expect(necessities.map(row => [row.period, row.percentage])).toEqual([
            [JAR_SHARE_BASELINE_PERIOD, '55.00'],
            [NOW, '45.00'],
        ]);
    });

    it('adds nothing when the split is saved unchanged', async () => {
        const { service, shares } = buildService();
        const before = shares.length;

        await inHousehold(() => service.updateSplit(fullSplit([55, 10, 10, 10, 10, 5])));

        expect(shares).toHaveLength(before);
    });

    it('writes the baseline first for a pot with no rows at all, so its past keeps its old share', async () => {
        const { service, shares } = buildService(DEFAULT_BOARD, { withShareHistory: false });

        await inHousehold(() => service.updateSplit(fullSplit([50, 15, 10, 10, 10, 5])));

        const necessities = shares.filter(
            row =>
                row.household === HOUSEHOLD && row.jar.id === `${HOUSEHOLD}-${JarKey.NECESSITIES}`
        );
        expect(necessities.map(row => [row.period, row.percentage])).toEqual([
            [JAR_SHARE_BASELINE_PERIOD, '55.00'],
            [NOW, '50.00'],
        ]);
        // Every other pot gets its baseline too (a household with no rows at all), and no
        // current-month row: it did not change.
        expect(shareOf(shares, JarKey.PLAY, NOW)).toBeUndefined();
        expect(shareOf(shares, JarKey.PLAY, JAR_SHARE_BASELINE_PERIOD)!.percentage).toBe('10.00');
    });

    it('never writes a share row for another household', async () => {
        const { service, shares } = buildService();

        await inHousehold(() => service.updateSplit(fullSplit([50, 15, 10, 10, 10, 5])));

        const other = shares.filter(row => row.household === OTHER_HOUSEHOLD);
        expect(other).toHaveLength(DEFAULT_BOARD.length);
        expect(other.every(row => row.period === JAR_SHARE_BASELINE_PERIOD)).toBe(true);
    });
});
