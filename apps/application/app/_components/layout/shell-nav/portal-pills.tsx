'use client';

import Link from 'next/link';

import { useTranslations } from '@rumtelo/i18n';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import type { MoreRow, NavTab, NavTabKey } from '@/app/_lib/nav';

import { MoreRows, type MoreRowActions } from './more-rows';

const PILL =
    'flex items-center gap-1.5 rounded-full px-3 py-2 font-mono lg:px-4 text-xs font-semibold tracking-widest uppercase outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent/40';

/**
 * Desktop pill bar: Home · Money · Growth · More. More is a menu button (never a link)
 * with the same rows as the phone sheet. The active pill has `aria-current="page"`.
 */
export function PortalPills({
    tabs,
    activeTab,
    moreRows,
    pathname,
    actions,
}: {
    tabs: readonly NavTab[];
    activeTab: NavTabKey | null;
    moreRows: readonly MoreRow[];
    pathname: string;
    actions: MoreRowActions;
}) {
    const t = useTranslations();

    return (
        <nav
            data-testid="main-nav"
            className="hidden min-w-0 flex-1 justify-center md:flex"
            aria-label={t('pages.shell.aria.main_nav')}>
            <div className="flex items-center gap-0.5 rounded-full border border-line bg-sunken p-1 shadow-md">
                {tabs.map(tab => {
                    const active = tab.key === activeTab;
                    const pillClass = cn(
                        PILL,
                        active ? 'bg-accent text-on-accent' : 'text-fg-secondary hover:text-accent'
                    );
                    const inner = (
                        <>
                            <span aria-hidden>{tab.glyph}</span>
                            {t(tab.labelKey)}
                        </>
                    );
                    if (tab.href !== null) {
                        return (
                            <Link
                                key={tab.key}
                                href={tab.href}
                                aria-current={active ? 'page' : undefined}
                                className={pillClass}>
                                {inner}
                            </Link>
                        );
                    }
                    return (
                        <DropdownMenu key={tab.key}>
                            <DropdownMenuTrigger asChild>
                                <button type="button" className={pillClass}>
                                    {inner}
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" sideOffset={10} className="w-72 p-1.5">
                                <MoreRows
                                    rows={moreRows}
                                    pathname={pathname}
                                    variant="menu"
                                    actions={actions}
                                />
                            </DropdownMenuContent>
                        </DropdownMenu>
                    );
                })}
            </div>
        </nav>
    );
}
