'use client';

import Link from 'next/link';

import { useTranslations } from '@rumtelo/i18n';
import { cn } from '@rumtelo/utils';

import type { NavTab, NavTabKey } from '@/app/_lib/nav';

const PILL =
    'flex items-center gap-1.5 rounded-full px-3 py-2 font-mono lg:px-4 text-xs font-semibold tracking-widest uppercase outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent/40';

/**
 * Desktop pill bar: the products (Home · Money · Growth · Soul). You is the avatar menu at the
 * top right, so it has no pill here. The active pill has `aria-current="page"`.
 */
export function PortalPills({
    tabs,
    activeTab,
}: {
    tabs: readonly NavTab[];
    activeTab: NavTabKey | null;
}) {
    const t = useTranslations();

    return (
        <nav
            data-testid="main-nav"
            className="hidden min-w-0 flex-1 justify-center md:flex"
            aria-label={t('pages.shell.aria.main_nav')}>
            <div className="flex items-center gap-0.5 rounded-full border border-line bg-sunken p-1 shadow-md">
                {tabs.map(tab => {
                    if (tab.pending || tab.href === null) return null;
                    const active = tab.key === activeTab;
                    return (
                        <Link
                            key={tab.key}
                            href={tab.href}
                            aria-current={active ? 'page' : undefined}
                            className={cn(
                                PILL,
                                active
                                    ? 'bg-accent text-on-accent'
                                    : 'text-fg-secondary hover:text-accent'
                            )}>
                            <span aria-hidden>{tab.glyph}</span>
                            {t(tab.labelKey)}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
