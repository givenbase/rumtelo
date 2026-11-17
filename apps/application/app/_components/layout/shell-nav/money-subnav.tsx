'use client';

import { useCallback } from 'react';

import Link from 'next/link';

import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations } from '@rumtelo/i18n';
import { cn, toPeriodKey } from '@rumtelo/utils';

import { apiQuery } from '@/app/_lib/api-hooks';
import { activeMoneySubnavKey, type MoneySubnavItem } from '@/app/_lib/nav';
import { isLiveData } from '@/app/_lib/preview';
import { useAuth } from '@/components/features/shell/auth-provider';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';

/**
 * Money sections: Jars · Inbox · Fixed costs · Income. One row of links on every width
 * (four fit at 375 px; if a longer language overflows, the row scrolls inside itself and
 * the active link scrolls into view). Links, not tabs: each is a page, with
 * `aria-current="page"`. The Inbox badge is visible text plus an `sr-only` count.
 */
export function MoneySubnav({
    items,
    pathname,
}: {
    items: readonly MoneySubnavItem[];
    pathname: string;
}) {
    const t = useTranslations();
    const { householdId } = useAuth();
    const { period } = useHouseholdShell();
    const activeKey = activeMoneySubnavKey(pathname);

    // Same query options as the Jars page and Home, so the cache is shared (no extra fetch).
    const dashboardQuery = useLiveQuery(
        apiQuery.money.dashboard.get.queryOptions({
            input: { householdId: householdId!, period: toPeriodKey(period.year, period.month) },
        }),
        null,
        isLiveData(householdId)
    );
    const inboxCount = dashboardQuery.data?.inboxCount ?? 0;

    // Runs when a link becomes the active one (stable callback), so a row that scrolls
    // inside itself keeps the active section in view.
    const scrollActiveIntoView = useCallback((node: HTMLAnchorElement | null) => {
        node?.scrollIntoView({ block: 'nearest', inline: 'center' });
    }, []);

    return (
        <nav
            aria-label={t('pages.nav.aria.money_sections')}
            className="flex min-w-0 snap-x gap-1.5 overflow-x-auto">
            {items.map(item => {
                const active = item.key === activeKey;
                const showBadge = item.badge === 'inbox' && inboxCount > 0;
                return (
                    <Link
                        key={item.key}
                        ref={active ? scrollActiveIntoView : undefined}
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                            'flex min-h-11 min-w-0 flex-1 snap-start items-center justify-center gap-1.5 rounded-full border px-2.5 text-center text-[13px] font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent/40 sm:flex-none sm:px-3.5 sm:py-1.5 sm:font-mono sm:text-xs sm:tracking-wide sm:uppercase',
                            active
                                ? 'border-accent-hover bg-accent-soft text-accent'
                                : 'border-line text-fg-muted hover:border-accent-hover hover:text-accent'
                        )}>
                        <span className="truncate">{t(item.labelKey)}</span>
                        {showBadge ? (
                            <>
                                <span
                                    aria-hidden
                                    className="grid min-w-5 shrink-0 place-items-center rounded-full bg-accent px-1.5 text-[11px] leading-5 font-semibold text-on-accent">
                                    {inboxCount}
                                </span>
                                <span className="sr-only">
                                    {t('pages.nav.inbox_badge_sr', { count: inboxCount })}
                                </span>
                            </>
                        ) : null}
                    </Link>
                );
            })}
        </nav>
    );
}
