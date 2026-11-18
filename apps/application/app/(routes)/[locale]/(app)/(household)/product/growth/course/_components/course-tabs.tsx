'use client';

import Link from 'next/link';

import { cn } from '@rumtelo/utils';

export interface CourseTab {
    key: string;
    href: string;
    label: string;
    isActive: boolean;
}

/** Pill tabs on top of Course: the layers, then Rhythm. Links, so each tab is a URL. */
export function CourseTabs({ ariaLabel, tabs }: { ariaLabel: string; tabs: readonly CourseTab[] }) {
    return (
        <nav
            aria-label={ariaLabel}
            className="flex max-w-full gap-1 overflow-x-auto rounded-full border border-line bg-card p-1">
            {tabs.map(tab => (
                <Link
                    key={tab.key}
                    href={tab.href}
                    aria-current={tab.isActive ? 'page' : undefined}
                    className={cn(
                        'shrink-0 rounded-full px-3.5 py-2 text-sm font-medium transition-colors sm:px-4',
                        tab.isActive
                            ? 'bg-accent text-on-accent'
                            : 'text-fg-secondary hover:bg-raised hover:text-fg'
                    )}>
                    {tab.label}
                </Link>
            ))}
        </nav>
    );
}
