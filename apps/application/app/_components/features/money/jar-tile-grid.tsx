'use client';

import Link from 'next/link';

import { JAR_GROUP_ORDER, type FixedCost, type JarBalance } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations } from '@rumtelo/i18n';
import { cn } from '@rumtelo/utils';

import { apiQuery } from '@/app/_lib/api-hooks';
import { resolveJarName } from '@/app/_lib/jar-copy';
import { jarIcon } from '@/app/_lib/jar-meta';
import { openBillCountsByJar } from '@/app/_lib/jar-open-bills';
import {
    GROUP_CHROME,
    GROUP_PARAM,
    groupSlug,
    jarsInGroup,
    sumGroupAmount,
} from '@/app/_lib/jar-group';
import { jarKeyToSlug } from '@/app/_lib/jar-slug';
import { jarsMonthSummary, jarTileFigures } from '@/app/_lib/jar-tile';
import { isLiveData } from '@/app/_lib/preview';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import { useAuth } from '@/components/features/shell/auth-provider';

export type JarTileJar = Pick<
    JarBalance,
    | 'id'
    | 'key'
    | 'name'
    | 'icon'
    | 'allocated'
    | 'credited'
    | 'spent'
    | 'committedOut'
    | 'potBalance'
    | 'percentage'
>;

const focusRing =
    'outline-none focus-visible:ring-2 focus-visible:ring-accent/25 focus-visible:ring-offset-2 focus-visible:ring-offset-surface';

/**
 * One jar: what is left this month as the big number, one meter, the pot and open bills.
 * The whole tile is the link to the jar. Amounts come from the API; only sums happen here.
 */
export function JarTile({
    jar,
    openBills,
    stacked,
}: {
    jar: JarTileJar;
    openBills: number;
    stacked: boolean;
}) {
    const t = useTranslations('features.money.jars');
    const { formatMoney } = useHouseholdCurrency();
    const figures = jarTileFigures(jar);
    const name = resolveJarName(t, jar.key, jar.name);

    return (
        <Link
            href={`/product/money/jars/${jarKeyToSlug(jar.key)}`}
            className={cn(
                'group flex h-full min-w-0 flex-col gap-3 rounded-2xl border border-line bg-surface p-3.5 transition-colors hover:border-line-strong hover:bg-raised @xl:p-4',
                focusRing
            )}>
            <span className="flex min-w-0 items-start gap-2">
                <span
                    aria-hidden
                    className="grid size-8 shrink-0 place-items-center rounded-lg border border-line bg-raised text-base">
                    {jarIcon(jar.key, jar.icon)}
                </span>
                <span className="grid min-w-0 gap-0.5 pt-0.5">
                    <span
                        title={name}
                        className="text-sm leading-tight font-semibold text-balance break-words text-fg">
                        {name}
                    </span>
                    {/* One literal line so a beginner knows what the pot is for. It may take two
                        lines now that some purposes are longer; `title` carries the full text. */}
                    <span
                        title={t(`purpose.${jar.key}`)}
                        className="line-clamp-2 text-xs leading-snug text-fg-muted">
                        {t(`purpose.${jar.key}`)}
                    </span>
                </span>
            </span>

            <span className="grid min-w-0 gap-0.5">
                <span
                    className={cn(
                        'truncate font-display text-xl leading-none font-semibold tracking-tight tabular-nums @2xl:text-2xl',
                        figures.overspent ? 'text-danger' : 'text-fg'
                    )}>
                    {formatMoney(figures.available)}
                </span>
                <span className="font-mono text-xs leading-snug text-fg-muted">
                    {t(stacked ? 'of_amount' : 'tile_of', {
                        amount: formatMoney(figures.envelope),
                    })}
                </span>
            </span>

            <span
                role="meter"
                aria-label={t('tile_meter_label', { name })}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={figures.overspent ? 0 : figures.meterPct}
                aria-valuetext={
                    figures.overspent
                        ? t('tile_meter_over')
                        : t('tile_meter_left', { pct: figures.meterPct })
                }
                className="block h-1.5 w-full overflow-hidden rounded-full bg-sunken">
                <span
                    aria-hidden
                    className={cn(
                        'block h-full rounded-full transition-all duration-500 ease-out',
                        figures.overspent ? 'bg-danger' : 'bg-accent'
                    )}
                    style={{ width: `${figures.meterPct}%` }}
                />
            </span>

            {/* Two fixed rows: the saved amount is never cut off, and the open-bills chip
                (or an empty row of the same height) keeps every tile the same height. */}
            <span className="mt-auto grid min-w-0 gap-1.5 font-mono text-xs">
                <span className="text-fg-muted">
                    {t('tile_saved')}{' '}
                    <span className="font-medium whitespace-nowrap text-fg tabular-nums">
                        {formatMoney(jar.potBalance)}
                    </span>
                </span>
                <span className="flex min-h-6 items-center">
                    {openBills > 0 ? (
                        <span className="inline-flex items-center rounded-full border border-warning/50 bg-warning/15 px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-warning">
                            {t('tile_open_bills', { count: openBills })}
                        </span>
                    ) : null}
                </span>
            </span>
        </Link>
    );
}

export function JarTileSkeleton() {
    return (
        <div
            aria-hidden
            className="h-[10.5rem] animate-pulse rounded-2xl border border-line bg-surface"
        />
    );
}

/**
 * Open-bills count per jar for the period. The one fixed-costs query the tile chips need;
 * the flat grid (Home) and the grouped board (Money) share it so both behave the same.
 */
export function useOpenBillsByJar(period: { year: number; month: number }): Map<string, number> {
    const { householdId } = useAuth();
    const live = isLiveData(householdId);

    const byJarQuery = useLiveQuery(
        apiQuery.money.fixedCosts.byJar.queryOptions({ input: { householdId: householdId! } }),
        [] as never,
        live
    );
    const fixedCosts: FixedCost[] = (byJarQuery.data ?? []).flatMap(group => group.items);
    return openBillCountsByJar(fixedCosts, period);
}

/**
 * The pots under one summary line, in their three groups (Basics, Future, Free): a small
 * numbered heading per group with its amount, then that group's tiles. Used on Home (inside
 * the money hero); Money uses the fuller `PotsBoard` (bar, shares, one group at a time), which
 * each heading here links to. Both read open bills through `useOpenBillsByJar`.
 */
export function JarTileGrid({
    jars,
    period,
    stacked = false,
    loading = false,
    className,
}: {
    jars: readonly JarTileJar[];
    period: { year: number; month: number };
    /** Looking ahead: amounts add up over several months, so "this month" would be wrong. */
    stacked?: boolean;
    loading?: boolean;
    className?: string;
}) {
    const t = useTranslations('features.money.jars');
    const tGroups = useTranslations('features.money.groups');
    const { formatMoney } = useHouseholdCurrency();
    const openByJar = useOpenBillsByJar(period);
    const summary = jarsMonthSummary(jars);
    const groups = JAR_GROUP_ORDER.filter(group => jarsInGroup(jars, group).length > 0);

    return (
        <div className={cn('@container min-w-0', className)}>
            {loading ? (
                <div className="grid grid-cols-1 gap-2.5 @md:grid-cols-2 @xl:gap-3 @3xl:grid-cols-3">
                    {Array.from({ length: 6 }, (_, index) => (
                        <JarTileSkeleton key={index} />
                    ))}
                </div>
            ) : (
                <>
                    {jars.length > 0 ? (
                        <p className="mb-3 flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5 font-mono text-xs text-fg-muted">
                            <span>{t(stacked ? 'left_label_stacked' : 'left_label')}</span>
                            <span
                                className={cn(
                                    'text-sm font-semibold tabular-nums',
                                    summary.available < 0 ? 'text-danger' : 'text-fg'
                                )}>
                                {formatMoney(summary.available)}
                            </span>
                            <span>{t('of_amount', { amount: formatMoney(summary.envelope) })}</span>
                        </p>
                    ) : null}
                    <div className="grid min-w-0 gap-5">
                        {groups.map(group => {
                            const title = tGroups(`${group}.title`);
                            const headingId = `home-pots-group-${groupSlug(group)}`;
                            return (
                                <section
                                    key={group}
                                    aria-labelledby={headingId}
                                    className="grid min-w-0 gap-2.5">
                                    <header className="flex min-w-0 items-center justify-between gap-3">
                                        <div className="flex min-w-0 items-center gap-2">
                                            <span
                                                aria-hidden
                                                className={cn(
                                                    'grid size-6 shrink-0 place-items-center rounded-full border border-line bg-raised font-mono text-xs font-semibold',
                                                    GROUP_CHROME[group].text
                                                )}>
                                                {JAR_GROUP_ORDER.indexOf(group) + 1}
                                            </span>
                                            <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                                <h3
                                                    id={headingId}
                                                    className="text-sm leading-tight font-semibold text-fg">
                                                    <Link
                                                        href={`/product/money/jars?${GROUP_PARAM}=${groupSlug(group)}`}
                                                        aria-label={tGroups('open_group', {
                                                            group: title,
                                                        })}
                                                        className={cn(
                                                            'inline-flex min-h-6 items-center rounded-md underline-offset-2 hover:underline',
                                                            focusRing
                                                        )}>
                                                        {title}
                                                        <span
                                                            aria-hidden
                                                            className="ml-1 text-fg-muted">
                                                            ›
                                                        </span>
                                                    </Link>
                                                </h3>
                                                <p className="text-xs leading-snug text-fg-muted">
                                                    {tGroups(`${group}.line`)}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="shrink-0 font-mono text-xs font-medium whitespace-nowrap text-fg tabular-nums">
                                            {formatMoney(
                                                sumGroupAmount(jars, group, jar => jar.allocated)
                                            )}
                                        </span>
                                    </header>
                                    <ul className="grid grid-cols-1 gap-2.5 @md:grid-cols-2 @xl:gap-3 @3xl:grid-cols-3">
                                        {jarsInGroup(jars, group).map(jar => (
                                            <li key={jar.id} className="min-w-0">
                                                <JarTile
                                                    jar={jar}
                                                    openBills={openByJar.get(jar.id) ?? 0}
                                                    stacked={stacked}
                                                />
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
