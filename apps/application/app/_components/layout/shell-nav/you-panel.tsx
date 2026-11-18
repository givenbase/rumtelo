'use client';

import { useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { LocaleSwitcher, useTranslations } from '@rumtelo/i18n';
import { useTheme } from '@rumtelo/ui';
import { accountThemeFromCss } from '@rumtelo/utils';

import { signOutToSignIn } from '@/app/_lib/auth';
import type { YouRow } from '@/app/_lib/nav';
import { planLabel } from '@/app/_lib/plan';
import { forceClearPracticePreview } from '@/app/_lib/practice-preview';
import { useAccountTheme } from '@/components/features/shell/account-theme-sync';
import { useAuth } from '@/components/features/shell/auth-provider';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';
import { usePracticePreview } from '@/components/features/shell/practice-preview';

import { YouRows, type YouRowActions } from './you-rows';

/** Name and email of the signed-in person, shared by the avatar button and the panel. */
export function useYouIdentity(): { userName: string; userEmail: string; userInitials: string } {
    const t = useTranslations();
    const { session } = useAuth();
    const userName = session?.user?.name?.trim() || t('pages.settings.guest');
    const userEmail = session?.user?.email ?? '';
    const parts = userName.split(/\s+/).filter(Boolean);
    const userInitials = (() => {
        if (parts.length >= 2) return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
        if (parts[0]?.length) return parts[0].slice(0, 2).toUpperCase();
        return (userEmail.slice(0, 2) || '?').toUpperCase();
    })();
    return { userName, userEmail, userInitials };
}

/**
 * Everything under "You": the cross-product rows (The Coach, Why Rumtelo, Settings, Help,
 * Practice, staging previews), then language, appearance, My plan and Sign out. One body for
 * the desktop avatar menu and the phone bottom sheet, so both always agree.
 */
export function YouPanel({
    rows,
    pathname,
    actions,
    isViewer,
    showIdentity,
    tall,
}: {
    rows: readonly YouRow[];
    pathname: string;
    actions: YouRowActions;
    isViewer: boolean;
    /** The desktop menu opens with who is signed in; the sheet has its own title. */
    showIdentity?: boolean;
    tall?: boolean;
}) {
    const t = useTranslations();
    const router = useRouter();
    const [signingOut, setSigningOut] = useState(false);
    const { plan, showToast } = useHouseholdShell();
    const { setAccountTheme } = useAccountTheme();
    const { resolvedTheme } = useTheme();
    const { capabilities } = usePracticePreview();
    const { userName, userEmail, userInitials } = useYouIdentity();
    const isDark = resolvedTheme === 'dark';

    async function handleSignOut() {
        setSigningOut(true);
        actions.onNavigate();
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
    const itemHeight = tall ? 'min-h-12' : 'min-h-11';

    return (
        <>
            {showIdentity ? (
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
            ) : null}

            {rows.length > 0 ? (
                <div className="grid gap-0.5 border-b border-line p-2">
                    <YouRows rows={rows} pathname={pathname} actions={actions} tall={tall} />
                </div>
            ) : null}

            <div className="grid gap-0.5 border-b border-line p-2">
                <div
                    className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 ${itemHeight}`}>
                    <span className="grid gap-0.5">
                        <span className="text-sm text-fg">{t('pages.shell.menu.language')}</span>
                        <span className="text-xs leading-tight text-fg-faint">
                            {t('pages.shell.menu.language_sub')}
                        </span>
                    </span>
                    <LocaleSwitcher />
                </div>
                <button
                    type="button"
                    onClick={handleToggleTheme}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-raised ${itemHeight}`}>
                    <span className="grid gap-0.5">
                        <span className="text-sm text-fg">{t('pages.shell.menu.appearance')}</span>
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

            <div className="grid gap-0.5 p-2">
                {showPlan ? (
                    <Link
                        href="/settings/general/plan"
                        onClick={actions.onNavigate}
                        className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-raised ${itemHeight}`}>
                        <span className="grid min-w-0 flex-1 gap-0.5">
                            <span className="text-sm text-fg">{t('pages.shell.menu.my_plan')}</span>
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
                    className={`grid w-full gap-0.5 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-raised ${itemHeight}`}>
                    <span className="text-sm text-danger">{t('pages.shell.menu.sign_out')}</span>
                    <span className="text-xs leading-tight text-fg-faint">
                        {t('pages.shell.menu.sign_out_sub')}
                    </span>
                </button>
            </div>
        </>
    );
}
