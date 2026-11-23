'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

import {
    JAR_GROUP_ORDER,
    JAR_ORDER_IN_GROUP,
    sumPercentageByGroup,
    type JarGroup,
} from '@rumtelo/contracts';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import { allocateByPercentage, cn } from '@rumtelo/utils';

import {
    GROUP_CHROME,
    GROUP_PARAM,
    formatShare,
    groupSlug,
    jarsInGroup,
    parseGroupParam,
    sumGroupAmount,
} from '@/app/_lib/jar-group';
import { jarsMonthSummary } from '@/app/_lib/jar-tile';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';

import { JarTile, JarTileSkeleton, useOpenBillsByJar, type JarTileJar } from './jar-tile-grid';

const focusRing =
    'outline-none focus-visible:ring-2 focus-visible:ring-accent/25 focus-visible:ring-offset-2 focus-visible:ring-offset-surface';

const TILE_GRID = 'grid grid-cols-1 gap-2.5 @md:grid-cols-2 @xl:gap-3 @3xl:grid-cols-3';

/**
 * Money › Pots: one summary (what is left, whether everything has a place, one bar over the
 * three groups) and then the six pots under Basics → Future → Free. `?group=basis|future|free`
 * narrows the board to one group; no param shows all three. Amounts come from the API — the
 * only sums here are per-group totals of the integer minor units the API already returned.
 */
export function PotsBoard({
    jars,
    period,
    incomeTotal,
    stacked = false,
    loading = false,
    className,
}: {
    jars: readonly JarTileJar[];
    period: { year: number; month: number };
    /** The period's net income as the API reports it (integer minor units). */
    incomeTotal: number;
    /** Looking ahead: amounts add up over several months, so "this month" would be wrong. */
    stacked?: boolean;
    loading?: boolean;
    className?: string;
}) {
    const t = useTranslations('features.money');
    const locale = useLocale();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { formatMoney } = useHouseholdCurrency();
    const openByJar = useOpenBillsByJar(period);

    const selected = parseGroupParam(searchParams.get(GROUP_PARAM));
    const visibleGroups = selected ? [selected] : JAR_GROUP_ORDER;

    /** Link to a group (or to all), keeping any other query param the page carries. */
    function viewHref(group: JarGroup | null): string {
        const next = new URLSearchParams(searchParams.toString());
        if (group) next.set(GROUP_PARAM, groupSlug(group));
        else next.delete(GROUP_PARAM);
        const query = next.toString();
        return query ? `${pathname}?${query}` : pathname;
    }

    if (loading) {
        return (
            <div className={cn('@container min-w-0', className)}>
                <div
                    aria-hidden
                    className="mb-4 h-28 animate-pulse rounded-2xl border border-line bg-surface"
                />
                <div className="grid gap-6">
                    {JAR_GROUP_ORDER.map(group => (
                        <div key={group} className={TILE_GRID}>
                            {JAR_ORDER_IN_GROUP[group].map(jarKey => (
                                <JarTileSkeleton key={jarKey} />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const shares = sumPercentageByGroup(jars);
    const totalShare = JAR_GROUP_ORDER.reduce((sum, group) => sum + shares[group], 0);
    const summary = jarsMonthSummary(jars);
    // "Left to place" follows the shares, not the allocated cents: the allocation hands the
    // rounding remainder to the largest pot, so allocated cents always add up to the income and
    // could never show a gap. Unplaced share (basis points) × the income the page already has,
    // for display only. Looking ahead the income and the stacked pots cover different spans, so
    // no figure is claimed there. Shares above 100 % show neither chip (settings blocks saving).
    const placedBasisPoints = Math.round(totalShare * 100);
    const unplacedBasisPoints = Math.max(0, 10_000 - placedBasisPoints);
    const leftToPlace =
        stacked || incomeTotal <= 0 || unplacedBasisPoints === 0
            ? 0
            : (allocateByPercentage(incomeTotal, [
                  { id: 'placed', percentage: placedBasisPoints / 100 },
                  { id: 'unplaced', percentage: unplacedBasisPoints / 100 },
              ]).find(part => part.id === 'unplaced')?.amount ?? 0);
    const isAllPlaced = !stacked && incomeTotal > 0 && placedBasisPoints === 10_000;
    const shownGroups = visibleGroups.filter(group => jarsInGroup(jars, group).length > 0);

    const shareText = (group: JarGroup) =>
        `${t(`groups.${group}.title`)} ${formatShare(shares[group], locale)}%`;
    const barLabel = t('groups.bar_label', {
        shares: JAR_GROUP_ORDER.map(shareText).join(', '),
    });

    if (jars.length === 0) return <div className={cn('@container min-w-0', className)} />;

    return (
        <div className={cn('@container grid min-w-0 gap-4', className)}>
            <section className="grid min-w-0 gap-3 rounded-2xl border border-line bg-surface p-3.5 @xl:p-4">
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2">
                    <p className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5 font-mono text-xs text-fg-muted">
                        <span>{t(stacked ? 'jars.left_label_stacked' : 'jars.left_label')}</span>
                        <span
                            className={cn(
                                'text-sm font-semibold whitespace-nowrap tabular-nums',
                                summary.available < 0 ? 'text-danger' : 'text-fg'
                            )}>
                            {formatMoney(summary.available)}
                        </span>
                        <span className="whitespace-nowrap">
                            {t('jars.of_amount', { amount: formatMoney(summary.envelope) })}
                        </span>
                    </p>
                    {leftToPlace > 0 ? (
                        <span className="inline-flex items-center rounded-full border border-warning/50 bg-warning/15 px-2.5 py-1 font-mono text-xs font-medium text-warning">
                            {t('groups.left_to_place', { amount: formatMoney(leftToPlace) })}
                        </span>
                    ) : isAllPlaced ? (
                        <span className="inline-flex items-center rounded-full border border-accent bg-accent-soft px-2.5 py-1 font-mono text-xs font-medium text-accent">
                            {t('groups.all_placed')}
                        </span>
                    ) : null}
                </div>

                <div
                    role="img"
                    aria-label={barLabel}
                    className="flex h-2.5 w-full overflow-hidden rounded-full bg-sunken">
                    {JAR_GROUP_ORDER.map(group => (
                        <span
                            key={group}
                            // A thin surface-coloured edge separates segments inside their own
                            // width, so the widths still add up to exactly 100 %.
                            className={cn(
                                'h-full min-w-0 border-surface not-first:border-l-2',
                                GROUP_CHROME[group].color
                            )}
                            // Data-driven width: the group's share of the split.
                            style={{ width: `${shares[group]}%` }}
                        />
                    ))}
                </div>

                {/* The bar has a text alternative; this legend is the visible version of it. */}
                <ul
                    aria-hidden
                    className="flex min-w-0 flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-fg-muted">
                    {JAR_GROUP_ORDER.map(group => (
                        <li key={group} className="flex min-w-0 items-center gap-1.5">
                            <span
                                className={cn(
                                    'size-2 shrink-0 rounded-sm',
                                    GROUP_CHROME[group].color
                                )}
                            />
                            <span className="whitespace-nowrap">{shareText(group)}</span>
                        </li>
                    ))}
                </ul>
            </section>

            <nav
                aria-label={t('groups.view_label')}
                className="grid min-w-0 grid-cols-4 gap-1 rounded-full border border-line bg-raised p-1 @xl:max-w-md">
                {[null, ...JAR_GROUP_ORDER].map(group => {
                    const label = group ? t(`groups.${group}.title`) : t('groups.all');
                    const isActive = group === selected;
                    return (
                        <Link
                            key={group ?? 'all'}
                            href={viewHref(group)}
                            scroll={false}
                            aria-current={isActive ? 'true' : undefined}
                            title={label}
                            className={cn(
                                'flex min-h-11 min-w-0 items-center justify-center rounded-full px-2 text-center text-xs font-medium transition-colors @md:text-sm',
                                isActive
                                    ? 'border border-accent bg-accent-soft text-accent'
                                    : 'border border-transparent text-fg-muted hover:text-fg',
                                focusRing
                            )}>
                            <span className="truncate">{label}</span>
                        </Link>
                    );
                })}
            </nav>

            {selected ? null : (
                <p className="font-mono text-xs text-fg-muted">{t('groups.order_hint')}</p>
            )}

            <div className="grid min-w-0 gap-6">
                {shownGroups.map(group => {
                    const groupJars = jarsInGroup(jars, group);
                    const position = JAR_GROUP_ORDER.indexOf(group) + 1;
                    const title = t(`groups.${group}.title`);
                    const headingId = `pots-group-${groupSlug(group)}`;
                    return (
                        <section
                            key={group}
                            aria-labelledby={headingId}
                            className="grid min-w-0 gap-3">
                            <header className="flex min-w-0 items-start justify-between gap-3">
                                <div className="flex min-w-0 items-start gap-2.5">
                                    <span
                                        aria-hidden
                                        className={cn(
                                            'grid size-7 shrink-0 place-items-center rounded-full border border-line bg-raised font-mono text-xs font-semibold',
                                            GROUP_CHROME[group].text
                                        )}>
                                        {position}
                                    </span>
                                    <div className="grid min-w-0 gap-0.5">
                                        <h3
                                            id={headingId}
                                            className="min-w-0 text-base leading-tight font-semibold text-fg">
                                            {selected ? (
                                                title
                                            ) : (
                                                <Link
                                                    href={viewHref(group)}
                                                    scroll={false}
                                                    aria-label={t('groups.open_group', {
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
                                            )}
                                        </h3>
                                        <p className="text-xs leading-snug text-fg-muted">
                                            {t(`groups.${group}.line`)}
                                        </p>
                                    </div>
                                </div>
                                <div className="grid shrink-0 justify-items-end gap-0.5 text-right">
                                    <span className="font-display text-base leading-tight font-semibold whitespace-nowrap text-fg tabular-nums">
                                        {formatMoney(
                                            sumGroupAmount(jars, group, jar => jar.allocated)
                                        )}
                                    </span>
                                    <span className="max-w-32 font-mono text-xs leading-snug text-balance text-fg-muted">
                                        {t('groups.share_of_income', {
                                            percent: formatShare(shares[group], locale),
                                        })}
                                    </span>
                                </div>
                            </header>
                            <ul className={TILE_GRID}>
                                {groupJars.map(jar => (
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
        </div>
    );
}
