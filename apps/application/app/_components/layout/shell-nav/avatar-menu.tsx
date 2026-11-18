'use client';

import { useState } from 'react';

import { useTranslations } from '@rumtelo/i18n';
import { cn } from '@rumtelo/utils';

import type { YouRow } from '@/app/_lib/nav';

import { YouPanel, useYouIdentity } from './you-panel';
import type { YouRowActions } from './you-rows';

/**
 * Desktop "You": the avatar menu. The cross-product rows (The Coach, Why Rumtelo, Settings,
 * Help, Practice, staging previews) first, then language, appearance, My plan and Sign out.
 * On phones the same body opens from the You tab in a sheet, so the avatar is `md` and up.
 * "Start a practice" lives in Settings › General › Practice.
 */
export function AvatarMenu({
    rows,
    pathname,
    actions,
    isViewer,
    active,
}: {
    rows: readonly YouRow[];
    pathname: string;
    actions: YouRowActions;
    isViewer: boolean;
    /** The current page belongs to You (The Coach, Why, Settings, a preview). */
    active: boolean;
}) {
    const t = useTranslations();
    const [open, setOpen] = useState(false);
    const { userInitials } = useYouIdentity();

    return (
        <div className="relative z-10 hidden shrink-0 md:block">
            <button
                type="button"
                onClick={() => setOpen(previous => !previous)}
                aria-label={t('pages.shell.aria.user_menu')}
                aria-expanded={open}
                className={cn(
                    'grid size-11 place-items-center rounded-full bg-accent font-mono text-xs font-bold text-on-accent transition outline-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 active:scale-95',
                    active && 'ring-2 ring-accent/50 ring-offset-2'
                )}>
                {userInitials}
            </button>

            {open && (
                <>
                    <button
                        type="button"
                        aria-label={t('pages.shell.aria.close_menu')}
                        onClick={() => setOpen(false)}
                        className="fixed inset-0 z-30 cursor-default"
                    />
                    <div className="absolute top-12 right-0 z-40 max-h-[calc(100dvh-5rem)] w-[min(20rem,calc(100vw-2rem))] animate-rise overflow-x-hidden overflow-y-auto rounded-2xl border border-line-strong bg-surface shadow-xl">
                        <YouPanel
                            rows={rows}
                            pathname={pathname}
                            actions={{
                                ...actions,
                                onNavigate: () => {
                                    setOpen(false);
                                    actions.onNavigate();
                                },
                            }}
                            isViewer={isViewer}
                            showIdentity
                        />
                    </div>
                </>
            )}
        </div>
    );
}
