'use client';

import { useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { LocaleSwitcher, useTranslations } from '@rumtelo/i18n';
import { useTheme } from '@rumtelo/ui';
import { accountThemeFromCss } from '@rumtelo/utils';

import { signOutToSignIn } from '@/app/_lib/auth';
import { planLabel } from '@/app/_lib/plan';
import { forceClearPracticePreview } from '@/app/_lib/practice-preview';
import { practicePath } from '@/app/_lib/routes';
import { useAccountTheme } from '@/components/features/shell/account-theme-sync';
import { useAuth } from '@/components/features/shell/auth-provider';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';
import { usePracticePreview } from '@/components/features/shell/practice-preview';

/**
 * The avatar menu: Language · Appearance · My plan · Sign out, plus "Go to practice" for
 * practice staff. Settings, Help and everything else live in More. "Start a practice" is
 * not offered here any more (it lives in Settings › General › Practice).
 */
export function AvatarMenu({
    isViewer,
    hasPractice,
    practiceName,
}: {
    isViewer: boolean;
    hasPractice: boolean;
    practiceName: string | null;
}) {
    const t = useTranslations();
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [signingOut, setSigningOut] = useState(false);
    const { plan, showToast } = useHouseholdShell();
    const { setAccountTheme } = useAccountTheme();
    const { resolvedTheme } = useTheme();
    const { session } = useAuth();
    const { capabilities, exitPreview } = usePracticePreview();

    const isDark = resolvedTheme === 'dark';
    const userName = session?.user?.name?.trim() || t('pages.settings.guest');
    const userEmail = session?.user?.email ?? '';
    const userInitials = (() => {
        const parts = userName.split(/\s+/).filter(Boolean);
        if (parts.length >= 2) return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
        if (parts[0]?.length) return parts[0].slice(0, 2).toUpperCase();
        return (userEmail.slice(0, 2) || '?').toUpperCase();
    })();

    async function handleSignOut() {
        setSigningOut(true);
        setOpen(false);
        try {
            // Never leave client-household preview headers after logout.
            forceClearPracticePreview();
            await signOutToSignIn(router);
        } catch {
            setSigningOut(false);
        }
    }

    function handleToggleTheme() {
        const next = isDark ? 'light' : 'dark';
        void setAccountTheme(accountThemeFromCss(next)).catch(error => {
            console.error('theme save failed', error);
            showToast(t('pages.settings.toasts.theme_failed'), 'error');
        });
    }

    // My plan is for people who can change it: hidden for a VIEWER and in Practice preview.
    const showPlan = capabilities.showSettings && !isViewer;

    return (
        <div className="relative z-10 shrink-0">
            <button
                type="button"
                onClick={() => setOpen(previous => !previous)}
                aria-label={t('pages.shell.aria.user_menu')}
                aria-expanded={open}
                className="grid size-11 place-items-center rounded-full bg-accent font-mono text-xs font-bold text-on-accent transition outline-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 active:scale-95">
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
                    <div className="absolute top-12 right-0 z-40 w-[min(18rem,calc(100vw-2rem))] animate-rise overflow-hidden rounded-2xl border border-line-strong bg-surface shadow-xl">
                        <div className="flex items-center gap-3 border-b border-line px-4.5 py-4">
                            <div className="grid size-9.5 shrink-0 place-items-center rounded-full bg-accent font-mono text-xs font-bold text-on-accent">
                                {userInitials}
                            </div>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-fg">{userName}</p>
                                <p className="truncate font-mono text-xs text-fg-faint">
                                    {userEmail || '—'}
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-0.5 border-b border-line p-2">
                            <div className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5">
                                <span className="grid gap-0.5">
                                    <span className="text-sm text-fg">
                                        {t('pages.shell.menu.language')}
                                    </span>
                                    <span className="text-xs leading-tight text-fg-faint">
                                        {t('pages.shell.menu.language_sub')}
                                    </span>
                                </span>
                                <LocaleSwitcher />
                            </div>
                            <button
                                type="button"
                                onClick={handleToggleTheme}
                                className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-raised">
                                <span className="grid gap-0.5">
                                    <span className="text-sm text-fg">
                                        {t('pages.shell.menu.appearance')}
                                    </span>
                                    <span className="text-xs leading-tight text-fg-faint">
                                        {t('pages.shell.menu.appearance_sub')}
                                    </span>
                                </span>
                                <span
                                    className="rounded-full border border-line px-2.5 py-1 font-mono text-xs font-semibold tracking-wide text-fg-muted"
                                    suppressHydrationWarning>
                                    {isDark
                                        ? t('pages.shell.menu.theme_dark')
                                        : t('pages.shell.menu.theme_light')}
                                </span>
                            </button>
                        </div>

                        {hasPractice ? (
                            <div className="border-b border-line px-2 pt-1 pb-2">
                                <Link
                                    href={practicePath()}
                                    onClick={() => {
                                        exitPreview();
                                        setOpen(false);
                                    }}
                                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-raised">
                                    <span
                                        aria-hidden
                                        className="grid size-6 shrink-0 place-items-center rounded-md bg-accent font-mono text-[10px] font-bold text-on-accent">
                                        P
                                    </span>
                                    <span className="grid min-w-0 gap-0.5">
                                        <span className="text-sm text-fg">
                                            {t('pages.practice.switcher.go_to_practice')}
                                        </span>
                                        <span className="truncate text-xs leading-tight text-fg-faint">
                                            {practiceName ?? t('pages.practice.nav.practice_label')}
                                        </span>
                                    </span>
                                </Link>
                            </div>
                        ) : null}

                        <div className="grid gap-0.5 p-2">
                            {showPlan ? (
                                <Link
                                    href="/settings/general/plan"
                                    onClick={() => setOpen(false)}
                                    className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-raised">
                                    <span className="grid min-w-0 flex-1 gap-0.5">
                                        <span className="text-sm text-fg">
                                            {t('pages.shell.menu.my_plan')}
                                        </span>
                                        <span className="text-xs leading-tight text-fg-faint">
                                            {t('pages.shell.menu.my_plan_sub')}
                                        </span>
                                    </span>
                                    <span className="shrink-0 rounded-full border border-line px-2.5 py-1 font-mono text-xs font-semibold tracking-wide text-fg-muted">
                                        {planLabel(plan, t)}
                                    </span>
                                </Link>
                            ) : null}
                            <button
                                type="button"
                                disabled={signingOut}
                                onClick={() => void handleSignOut()}
                                className="grid w-full gap-0.5 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-raised">
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
            )}
        </div>
    );
}
