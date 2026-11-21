'use client';

import Link from 'next/link';

import type { FixedCost, JarBalance } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations } from '@rumtelo/i18n';
import { cn } from '@rumtelo/utils';

import { apiQuery } from '@/app/_lib/api-hooks';
import { resolveJarName } from '@/app/_lib/jar-copy';
import { jarIcon } from '@/app/_lib/jar-meta';
import { openBillCountsByJar } from '@/app/_lib/jar-open-bills';
import { jarKeyToSlug } from '@/app/_lib/jar-slug';
import { jarsMonthSummary, jarTileFigures } from '@/app/_lib/jar-tile';
import { isLiveData } from '@/app/_lib/preview';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import { useAuth } from '@/components/features/shell/auth-provider';

type JarTileJar = Pick<
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
>;

const focusRing =
    'outline-none focus-visible:ring-2 focus-visible:ring-accent/25 focus-visible:ring-offset-2 focus-visible:ring-offset-surface';

/**
 * One jar: what is left this month as the big number, one meter, the pot and open bills.
 * The whole tile is the link to the jar. Amounts come from the API; only sums happen here.
 */
function JarTile({
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
                    <span className="text-sm leading-tight font-semibold text-balance break-words text-fg">
                        {name}
                    </span>
                    {/* One literal line so a beginner knows what the jar is for. */}
                    <span className="text-xs leading-snug text-pretty text-fg-muted">
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

            <span className="mt-auto flex min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-1.5 font-mono text-xs">
                <span className="min-w-0 text-fg-muted">
                    {t('tile_saved')}{' '}
                    <span className="font-medium text-fg tabular-nums">
                        {formatMoney(jar.potBalance)}
                    </span>
                </span>
                {openBills > 0 ? (
                    <span className="inline-flex shrink-0 items-center rounded-full border border-warning/50 bg-warning/15 px-2 py-0.5 text-[11px] font-medium text-warning">
                        {t('tile_open_bills', { count: openBills })}
                    </span>
                ) : null}
            </span>
        </Link>
    );
}

function JarTileSkeleton() {
    return (
        <div
            aria-hidden
            className="h-[10.5rem] animate-pulse rounded-2xl border border-line bg-surface"
        />
    );
}

/**
 * Six jars as a compact grid (2 columns, 3 when the container is wide) under one summary
 * line. Used on Home (inside the money hero) and on Money › Jars. Owns the one fixed-costs
 * query the "open bills" chips need, so both surfaces behave the same.
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
    const { householdId } = useAuth();
    const { formatMoney } = useHouseholdCurrency();
    const live = isLiveData(householdId);

    const byJarQuery = useLiveQuery(
        apiQuery.money.fixedCosts.byJar.queryOptions({ input: { householdId: householdId! } }),
        [] as never,
        live
    );
    const fixedCosts: FixedCost[] = (byJarQuery.data ?? []).flatMap(group => group.items);
    const openByJar = openBillCountsByJar(fixedCosts, period);
    const summary = jarsMonthSummary(jars);

    return (
        <div className={cn('@container min-w-0', className)}>
            {loading ? (
                <div className="grid grid-cols-2 gap-2.5 @xl:grid-cols-3 @xl:gap-3">
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
                    <ul className="grid grid-cols-2 gap-2.5 @xl:grid-cols-3 @xl:gap-3">
                        {jars.map(jar => (
                            <li key={jar.id} className="min-w-0">
                                <JarTile
                                    jar={jar}
                                    openBills={openByJar.get(jar.id) ?? 0}
                                    stacked={stacked}
                                />
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </div>
    );
}
