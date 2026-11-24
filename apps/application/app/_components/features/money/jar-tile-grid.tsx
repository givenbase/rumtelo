'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import type { FixedCost, JarBalance } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import { cn } from '@rumtelo/utils';

import { apiQuery } from '@/app/_lib/api-hooks';
import { resolvePotName, resolvePotPurpose } from '@/app/_lib/jar-copy';
import { jarIcon } from '@/app/_lib/jar-meta';
import { openBillCountsByJar } from '@/app/_lib/jar-open-bills';
import {
    GROUP_CHROME,
    GROUP_PARAM,
    formatShare,
    groupBlocks,
    groupSlug,
    groupViews,
    sumGroupAmount,
    type JarGroupView,
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

/** Tiles of a refined group (as before): one, two or three columns by the width of the container. */
export const GROUP_TILE_GRID =
    'grid grid-cols-1 gap-2.5 @md:grid-cols-2 @xl:gap-3 @3xl:grid-cols-3';

/** Single-pot groups side by side: stacked on a phone, one row of three once there is room. */
export const SINGLE_TILE_ROW = 'grid grid-cols-1 gap-2.5 @xl:grid-cols-3 @xl:gap-3';

/**
 * One jar: what is left this month as the big number, one meter, the pot and open bills.
 * The whole tile is the link to the jar. Amounts come from the API; only sums happen here.
 */
export function JarTile({
    jar,
    openBills,
    stacked,
    presentKeys,
    groupPosition,
}: {
    jar: JarTileJar;
    openBills: number;
    stacked: boolean;
    /** Keys of every pot the household has: decides group name vs pot name and purpose. */
    presentKeys: readonly string[];
    /** Set on a tile that stands for its whole group (no heading above it): 1, 2 or 3. */
    groupPosition?: number;
}) {
    const t = useTranslations('features.money.jars');
    const tGroups = useTranslations('features.money.groups');
    const locale = useLocale();
    const { formatMoney } = useHouseholdCurrency();
    const figures = jarTileFigures(jar);
    const translators = { jars: t, groups: tGroups };
    const name = resolvePotName(translators, jar.key, jar.name, presentKeys);
    const purpose = resolvePotPurpose(translators, jar.key, presentKeys);

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
                        title={purpose}
                        className="line-clamp-2 text-xs leading-snug text-fg-muted">
                        {purpose}
                    </span>
                </span>
                {groupPosition ? (
                    <span
                        aria-hidden
                        className="ml-auto grid size-6 shrink-0 place-items-center rounded-full border border-line bg-raised font-mono text-xs font-semibold text-fg-muted">
                        {groupPosition}
                    </span>
                ) : null}
            </span>

            <span className="grid min-w-0 gap-0.5">
                <span
                    className={cn(
                        // A money figure never loses digits: on a narrow tile it wraps instead of being cut off.
                        'font-display text-xl leading-tight font-semibold tracking-tight wrap-anywhere tabular-nums @2xl:text-2xl',
                        figures.overspent ? 'text-danger' : 'text-fg'
                    )}>
                    {formatMoney(figures.available)}
                </span>
                <span className="font-mono text-xs leading-snug text-fg-muted">
                    {t(stacked ? 'of_amount' : 'tile_of', {
                        amount: formatMoney(figures.envelope),
                    })}
                </span>
                {/* The pot's share of the split, as a memory aid next to the amount it gives. */}
                <span className="font-mono text-xs leading-snug text-fg-muted">
                    {tGroups('share_of_income', {
                        percent: formatShare(jar.percentage, locale),
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
            className="h-[11.5rem] animate-pulse rounded-2xl border border-line bg-surface"
        />
    );
}

/** Three tiles while the pots load: a new household has three pots, so six would be a lie. */
export function JarTileSkeletonRow() {
    return (
        <div className={SINGLE_TILE_ROW}>
            {Array.from({ length: 3 }, (_, index) => (
                <JarTileSkeleton key={index} />
            ))}
        </div>
    );
}

/**
 * Groups that are not refined, as one row of tiles: each tile is named after its group and
 * carries the group's number, so there is no "Basics" heading above a "Basics" tile.
 * `footer` adds something under a tile (the pots board puts its "Refine" link there).
 */
export function SingleGroupTiles({
    views,
    presentKeys,
    openByJar,
    stacked,
    footer,
}: {
    views: readonly JarGroupView<JarTileJar>[];
    presentKeys: readonly string[];
    openByJar: Map<string, number>;
    stacked: boolean;
    footer?: (view: JarGroupView<JarTileJar>) => ReactNode;
}) {
    return (
        <ul className={SINGLE_TILE_ROW}>
            {views.map(view => {
                const jar = view.jars[0]!;
                return (
                    <li key={view.group} className="grid min-w-0 content-start gap-1">
                        <JarTile
                            jar={jar}
                            openBills={openByJar.get(jar.id) ?? 0}
                            stacked={stacked}
                            presentKeys={presentKeys}
                            groupPosition={view.position}
                        />
                        {footer?.(view)}
                    </li>
                );
            })}
        </ul>
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
 * The pots under one summary line, in their three groups (Basics, Future, Free). A group
 * that is not refined is one tile named after the group (with its number 1/2/3), side by side
 * with the other unrefined groups; a refined group gets a numbered heading with its amount and
 * its tiles. Money uses the fuller `PotsBoard` (bar, shares, one group at a time), which each
 * heading here links to. Both read open bills through `useOpenBillsByJar`.
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
    const presentKeys = jars.map(jar => jar.key);
    const blocks = groupBlocks(groupViews(jars));

    return (
        <div className={cn('@container min-w-0', className)}>
            {loading ? (
                <JarTileSkeletonRow />
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
                        {blocks.map(block => {
                            if (block.kind === 'tiles') {
                                return (
                                    <SingleGroupTiles
                                        key={block.views.map(view => view.group).join('-')}
                                        views={block.views}
                                        presentKeys={presentKeys}
                                        openByJar={openByJar}
                                        stacked={stacked}
                                    />
                                );
                            }
                            const { group, position, jars: groupJars } = block.view;
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
                                                {position}
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
                                                            // The link stays 24 px tall; the pseudo-element stretches its tap area to 44 px.
                                                            'relative inline-flex min-h-6 items-center rounded-md underline-offset-2 before:absolute before:inset-x-0 before:-inset-y-2.5 hover:underline',
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
                                    <ul className={GROUP_TILE_GRID}>
                                        {groupJars.map(jar => (
                                            <li key={jar.id} className="min-w-0">
                                                <JarTile
                                                    jar={jar}
                                                    openBills={openByJar.get(jar.id) ?? 0}
                                                    stacked={stacked}
                                                    presentKeys={presentKeys}
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
