'use client';

import Link from 'next/link';

import { useTranslations } from '@rumtelo/i18n';
import { cn } from '@rumtelo/utils';

import type { NavTab, NavTabKey } from '@/app/_lib/nav';

/** Literal class names, so Tailwind sees them. */
const TAB_GRID_COLUMNS: Record<number, string> = {
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
};

/**
 * Phone bottom tabs: Home · Money · Growth · Soul · You. Growth and Soul (Mindset) join after
 * the first week check and a VIEWER never has them, so the bar is three cells until then.
 * The active tab is text-accent plus a 2 px top bar, so the state is never colour alone,
 * and links carry `aria-current="page"`. You is a button that opens the sheet (the phone version of the avatar menu).
 */
export function BottomTabs({
    tabs,
    activeTab,
    youOpen,
    onOpenYou,
}: {
    tabs: readonly NavTab[];
    activeTab: NavTabKey | null;
    youOpen: boolean;
    onOpenYou: () => void;
}) {
    const t = useTranslations();

    return (
        <nav
            className={cn(
                'fixed inset-x-0 bottom-0 z-40 grid border-t border-line bg-chrome pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden',
                TAB_GRID_COLUMNS[Math.min(tabs.length, 5)] ?? 'grid-cols-5'
            )}
            aria-label={t('pages.nav.aria.mobile_tabs')}>
            {tabs.map(tab => {
                // The Growth and Soul slots while the stage loads: keeps the grid still, offers nothing.
                if (tab.pending) {
                    return <span key={tab.key} aria-hidden className="min-h-14" />;
                }
                const active = tab.key === activeTab;
                const className = cn(
                    'relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 px-1 text-xs font-medium transition-colors outline-none focus-visible:bg-raised focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-inset',
                    active ? 'text-accent' : 'text-fg-muted'
                );
                const content = (
                    <>
                        {active ? (
                            <span
                                aria-hidden
                                className="absolute inset-x-3 top-0 h-0.5 rounded-b bg-accent"
                            />
                        ) : null}
                        <span aria-hidden className="text-base">
                            {tab.glyph}
                        </span>
                        <span className="max-w-full truncate">{t(tab.labelKey)}</span>
                    </>
                );
                if (tab.href === null) {
                    return (
                        <button
                            key={tab.key}
                            type="button"
                            aria-haspopup="dialog"
                            aria-expanded={youOpen}
                            onClick={onOpenYou}
                            className={className}>
                            {content}
                        </button>
                    );
                }
                return (
                    <Link
                        key={tab.key}
                        href={tab.href}
                        aria-current={active ? 'page' : undefined}
                        className={className}>
                        {content}
                    </Link>
                );
            })}
        </nav>
    );
}
