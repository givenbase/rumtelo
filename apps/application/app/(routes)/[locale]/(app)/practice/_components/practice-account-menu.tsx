'use client';

import { useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useTranslations } from '@rumtelo/i18n';
import { cn } from '@rumtelo/utils';

import { signOut } from '@/app/_lib/auth';
import { forceClearPracticePreview } from '@/app/_lib/practice-preview';
import { practiceSettingsHref } from '@/app/_lib/practice-settings-tabs';
import { useAuth } from '@/components/features/shell/auth-provider';

/**
 * Practice-plane account menu — avatar, practice settings, sign out.
 * No household exit: Practice staff manage client households via preview headers,
 * they do not have a personal household board on this account.
 */
export function PracticeAccountMenu() {
    const t = useTranslations();
    const router = useRouter();
    const { session } = useAuth();
    const [open, setOpen] = useState(false);
    const [signingOut, setSigningOut] = useState(false);

    const userName = session?.user?.name?.trim() || t('pages.settings.guest');
    const userEmail = session?.user?.email ?? '';
    const initials = (() => {
        const parts = userName.split(/\s+/).filter(Boolean);
        if (parts.length >= 2) {
            return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
        }
        if (parts[0]?.length) return parts[0].slice(0, 2).toUpperCase();
        return (userEmail.slice(0, 2) || '?').toUpperCase();
    })();

    async function handleSignOut() {
        setSigningOut(true);
        setOpen(false);
        try {
            forceClearPracticePreview();
            await signOut();
            router.replace('/sign-in');
        } catch {
            setSigningOut(false);
        }
    }

    return (
        <div className="relative z-10 shrink-0">
            <button
                type="button"
                onClick={() => setOpen(previous => !previous)}
                aria-label={t('pages.shell.aria.user_menu')}
                aria-expanded={open}
                className="grid size-9 place-items-center rounded-full bg-accent font-mono text-xs font-bold text-on-accent transition hover:brightness-110 active:scale-95">
                {initials}
            </button>

            {open ? (
                <>
                    <button
                        type="button"
                        aria-label={t('pages.shell.aria.close_menu')}
                        onClick={() => setOpen(false)}
                        className="fixed inset-0 z-30 cursor-default"
                    />
                    <div className="absolute top-11 right-0 z-40 w-[min(18rem,calc(100vw-2rem))] animate-rise overflow-hidden rounded-2xl border border-line-strong bg-surface shadow-xl">
                        <div className="flex items-center gap-3 border-b border-line px-4.5 py-4">
                            <div className="grid size-9.5 shrink-0 place-items-center rounded-full bg-accent font-mono text-xs font-bold text-on-accent">
                                {initials}
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-fg">{userName}</p>
                                <p className="truncate font-mono text-xs text-fg-faint">
                                    {userEmail || '—'}
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-0.5 p-2">
                            <Link
                                href={practiceSettingsHref('billing')}
                                onClick={() => setOpen(false)}
                                className="grid gap-0.5 rounded-lg px-3 py-2.5 transition-colors hover:bg-raised">
                                <span className="text-sm text-fg">
                                    {t('pages.practice.menu.settings')}
                                </span>
                                <span className="text-xs leading-tight text-fg-faint">
                                    {t('pages.practice.menu.settings_sub')}
                                </span>
                            </Link>
                            <button
                                type="button"
                                disabled={signingOut}
                                onClick={() => void handleSignOut()}
                                className={cn(
                                    'grid w-full gap-0.5 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-raised',
                                    'disabled:opacity-60'
                                )}>
                                <span className="text-sm text-danger">
                                    {t('pages.shell.menu.sign_out')}
                                </span>
                                <span className="text-xs leading-tight text-fg-faint">
                                    {t('pages.shell.menu.sign_out_sub')}
                                </span>
                            </button>
                        </div>
                    </div>
                </>
            ) : null}
        </div>
    );
}
