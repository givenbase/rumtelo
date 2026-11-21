'use client';

import { useCallback } from 'react';

import Link from 'next/link';

import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations } from '@rumtelo/i18n';
import { Icon } from '@rumtelo/ui';
import { cn, toPeriodKey } from '@rumtelo/utils';

import { apiQuery } from '@/app/_lib/api-hooks';
import type { SubnavItem } from '@/app/_lib/nav';
import { isLiveData } from '@/app/_lib/preview';
import { useAuth } from '@/components/features/shell/auth-provider';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';

/**
 * The sections of one product (Money: Jars · Transactions · Fixed costs · Income · Debt ·
 * Net worth; Growth: Course · Goals · Learn). One row of links on every width; when the row
 * is longer than the screen it scrolls inside itself and the active link scrolls into view.
 * Links, not tabs: each is a page, with `aria-current="page"`.
 *
 * Ladder and plan states live here, not in a menu:
 * - `later`: muted with a clock and a screen-reader hint ("Shows after …"); still a link.
 * - `locked`: a lock icon and a hint; the link leads to the plan LockCard page.
 */
export function ProductSubnav({
    items,
    activeKey,
    ariaLabel,
}: {
    items: readonly SubnavItem[];
    activeKey: string | null;
    ariaLabel: string;
}) {
    const t = useTranslations();
    // Same query options as the Jars page and Home, so the cache is shared (no extra fetch).
    const toSortCount = useToSortCount(items.some(item => item.badge === 'to_sort'));

    // Runs when a link becomes the active one (stable callback), so a row that scrolls
    // inside itself keeps the active section in view.
    const scrollActiveIntoView = useCallback((node: HTMLAnchorElement | null) => {
        node?.scrollIntoView({ block: 'nearest', inline: 'center' });
    }, []);

    return (
        <nav
            aria-label={ariaLabel}
            className="flex min-w-0 snap-x [scrollbar-width:none] gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
            {items.map(item => {
                const active = item.key === activeKey;
                const showBadge = item.badge === 'to_sort' && toSortCount > 0;
                const muted = item.state !== 'open' && !active;
                return (
                    <Link
                        key={item.key}
                        ref={active ? scrollActiveIntoView : undefined}
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                            'flex min-h-11 shrink-0 snap-start items-center justify-center gap-1.5 rounded-full border px-3.5 text-center text-[13px] font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent/40 sm:py-1.5 sm:font-mono sm:text-xs sm:tracking-wide sm:uppercase',
                            active
                                ? 'border-accent-hover bg-accent-soft text-accent'
                                : 'border-line text-fg-muted hover:bg-raised hover:text-fg',
                            muted && 'border-dashed text-fg-faint'
                        )}>
                        <span>{t(item.labelKey)}</span>
                        {item.state === 'later' ? (
                            <>
                                <Icon name="clock" size="sm" aria-hidden className="shrink-0" />
                                <span className="sr-only">
                                    {t(
                                        item.laterUntil === 'week_check'
                                            ? 'pages.nav.later_hint.week_check'
                                            : 'pages.nav.later_hint.month_close'
                                    )}
                                </span>
                            </>
                        ) : null}
                        {item.state === 'locked' ? (
                            <>
                                <Icon name="lock" size="sm" aria-hidden className="shrink-0" />
                                <span className="sr-only">{t('pages.nav.locked_hint')}</span>
                            </>
                        ) : null}
                        {showBadge ? (
                            <>
                                <span
                                    aria-hidden
                                    className="grid min-w-5 shrink-0 place-items-center rounded-full bg-accent px-1.5 text-[11px] leading-5 font-semibold text-on-accent">
                                    {toSortCount}
                                </span>
                                <span className="sr-only">
                                    {t('pages.nav.to_sort_badge_sr', { count: toSortCount })}
                                </span>
                            </>
                        ) : null}
                    </Link>
                );
            })}
        </nav>
    );
}

/** Items still to sort this period; only read when the subnav shows the "to sort" badge. */
function useToSortCount(enabled: boolean): number {
    const { householdId } = useAuth();
    const { period } = useHouseholdShell();
    const dashboardQuery = useLiveQuery(
        apiQuery.money.dashboard.get.queryOptions({
            input: { householdId: householdId!, period: toPeriodKey(period.year, period.month) },
        }),
        null,
        enabled && isLiveData(householdId)
    );
    return dashboardQuery.data?.inboxCount ?? 0;
}
