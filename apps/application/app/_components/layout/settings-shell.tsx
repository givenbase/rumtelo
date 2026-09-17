'use client';

import type { ReactNode } from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Typography } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import {
    SETTINGS_SECTIONS,
    settingsHref,
    settingsTabFromPathname,
    type SettingsNavItem,
} from '@/app/_lib/settings-tabs';
import { PageContent } from '@/components/layout/page-content';

function NavLink({
    tab,
    active,
    compact,
}: {
    tab: SettingsNavItem;
    active: boolean;
    /** Single-line rail item (desktop). */
    compact?: boolean;
}) {
    return (
        <Link
            href={settingsHref(tab.key)}
            title={tab.sub}
            className={cn(
                'transition-colors',
                compact
                    ? cn(
                          'flex items-center gap-2 rounded-md border-l-2 px-2.5 py-1.5 text-[13px] leading-tight',
                          active
                              ? 'border-l-accent bg-accent-soft font-medium text-accent'
                              : 'border-l-transparent text-fg-secondary hover:bg-raised hover:text-fg'
                      )
                    : cn(
                          'shrink-0 rounded-full border px-3 py-1.5 text-xs whitespace-nowrap',
                          active
                              ? 'border-accent bg-accent-soft font-medium text-accent'
                              : 'border-line text-fg-secondary hover:border-accent/40 hover:text-fg'
                      )
            )}>
            {compact ? (
                <>
                    <span
                        className={cn(
                            'w-2.5 shrink-0 text-center font-mono text-[10px]',
                            active ? 'text-accent' : 'text-fg-faint'
                        )}
                        aria-hidden>
                        {active ? '✦' : '·'}
                    </span>
                    <span className="min-w-0 truncate">{tab.label}</span>
                </>
            ) : (
                tab.label
            )}
        </Link>
    );
}

/**
 * Shared settings chrome. Active section comes from the URL path
 * (`/settings/product/money/jars`), not query params — each section is a real page.
 */
export function SettingsShell({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const activeTab = settingsTabFromPathname(pathname);

    return (
        <PageContent width="wide" className="animate-rise">
            <header className="mb-5 max-w-[60ch]">
                <p className="font-mono text-[10px] font-medium tracking-[0.16em] text-accent uppercase">
                    ✦ Settings
                </p>
                <Typography
                    as="h1"
                    size="sm"
                    className="mt-1.5 text-[clamp(1.375rem,3.5vw,1.875rem)] lg:text-[clamp(1.375rem,3.5vw,1.875rem)]">
                    Everything you set once.
                </Typography>
                <Typography as="p" size="sm" color="muted" className="mt-1.5 text-pretty">
                    Rules and choices live here. The numbers themselves live on their own screens.
                </Typography>
            </header>

            <div className="flex flex-col gap-5 md:flex-row md:items-start md:gap-6">
                {/* Mobile: one horizontal chip row */}
                <nav
                    aria-label="Settings sections"
                    className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 md:hidden">
                    {SETTINGS_SECTIONS.flatMap(section => section.items).map(tab => (
                        <NavLink key={tab.key} tab={tab} active={tab.key === activeTab} />
                    ))}
                </nav>

                {/* Desktop: compact grouped rail */}
                <nav
                    aria-label="Settings navigation"
                    className="hidden shrink-0 content-start gap-3 md:grid md:w-40">
                    {SETTINGS_SECTIONS.map(section => (
                        <div key={section.title} className="grid gap-px">
                            <p className="px-2.5 pb-1 font-mono text-[9px] font-semibold tracking-[0.16em] text-fg-faint uppercase">
                                {section.title}
                            </p>
                            <ul className="grid gap-px">
                                {section.items.map(tab => (
                                    <li key={tab.key}>
                                        <NavLink tab={tab} active={tab.key === activeTab} compact />
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </nav>

                <div className="w-full max-w-190 min-w-0">{children}</div>
            </div>
        </PageContent>
    );
}
