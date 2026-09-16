'use client';

import { useState, type ReactNode } from 'react';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { RumteloLogo } from '@rumtelo/brand';
import { cn, accountThemeFromCss } from '@rumtelo/utils';
import { Locale } from '@rumtelo/contracts';
import { useTheme } from '@rumtelo/ui';

import { signOut } from '@/app/_lib/auth';
import {
    BOTTOM_TABS,
    NAV_GROUPS,
    TOP_PILL_LABELS,
    resolveNavChildForPath,
    resolveNavGroupForPath,
} from '@/app/_lib/nav';
import { PLAN_LABELS } from '@/app/_lib/plan';
import { settingsHrefForPathname } from '@/app/_lib/settings-tabs';
import { useAccountTheme } from '@/components/features/shell/account-theme-sync';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';
import { OnboardingOverlay } from '@/components/features/shell/onboarding-overlay';
import { PendingPlanCheckout } from '@/components/features/shell/pending-plan-checkout';
import { CapabilityGate } from '@/components/features/shell/capability-gate';
import { usePlanCapabilities } from '@/components/features/shell/use-plan-capabilities';
import { PageHelpButton, PageTourProvider } from '@/components/features/tour';
import { FeatureHelpersProvider, WhyCaption } from '@/components/features/helpers';
import { PageContentWidthProvider } from '@/components/layout/page-content-width';

import { PeriodSelector } from './period-selector';
import { PeriodTravelBanner } from './period-travel-banner';
import { QuickAddFab } from './quick-add';
import { ToastPill } from './toast';
// ── Menu items ───────────────────────────────────────────────────────────────

interface MenuItem {
    label: string;
    sub: string;
    href: string | null;
    danger: boolean;
}

const MENU_ITEMS: MenuItem[] = [
    {
        label: 'Settings',
        sub: 'Household prefs for this screen',
        href: '__settings__',
        danger: false,
    },
    {
        label: 'My plan',
        sub: 'Manage your subscription',
        href: '/settings/general/plan',
        danger: false,
    },
    { label: 'Sign out', sub: 'You stay signed in for 30 days', href: null, danger: true },
];

// ── Subnav tint — each group borrows a jar hue (design: TINTS) ───────────────

const SUBNAV_TINT: Record<string, string> = {
    home: 'border-t-jar-ff',
    money: 'border-t-jar-give',
    growth: 'border-t-jar-lts',
    energy: 'border-t-jar-play',
    soul: 'border-t-portal-soul',
};

// ── Public export ─────────────────────────────────────────────────────────────

/**
 * Top-level shell — wraps every authenticated page.
 * `AppShellProvider` lives in `app/providers.tsx`; this component consumes it.
 */
export function AppShell({ children }: { children: ReactNode }) {
    return (
        <FeatureHelpersProvider>
            <PageContentWidthProvider>
                <PageTourProvider>
                    <AppShellInner>{children}</AppShellInner>
                </PageTourProvider>
            </PageContentWidthProvider>
        </FeatureHelpersProvider>
    );
}

// ── Also re-export useAppShell so consumers don't need two imports ────────────
export { useAppShell } from '@/components/features/shell/app-shell-context';

// ── Inner shell (has access to context) ──────────────────────────────────────

function AppShellInner({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [menuOpen, setMenuOpen] = useState(false);
    const [portalOpen, setPortalOpen] = useState(false);
    const [subOpen, setSubOpen] = useState(false);
    const [signingOut, setSigningOut] = useState(false);
    const { toggleLocale, locale, plan } = useAppShell();
    const { setAccountTheme } = useAccountTheme();
    const { resolvedTheme } = useTheme();
    const { isCapabilityLocked, accessForPath } = usePlanCapabilities();
    const { session } = useAuth();

    const isDark = resolvedTheme === 'dark';
    const localeLabel = locale === Locale.NL ? 'NL' : 'EN';
    const planLabel = PLAN_LABELS[plan];

    const userName = session?.user?.name?.trim() || 'Guest';
    const userEmail = session?.user?.email ?? '';
    const userInitials = (() => {
        const parts = userName.split(/\s+/).filter(Boolean);
        if (parts.length >= 2) {
            return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
        }
        if (parts[0]?.length) return parts[0].slice(0, 2).toUpperCase();
        return (userEmail.slice(0, 2) || '?').toUpperCase();
    })();

    function closeOverlays() {
        setMenuOpen(false);
        setPortalOpen(false);
        setSubOpen(false);
    }

    async function handleSignOut() {
        setSigningOut(true);
        closeOverlays();
        try {
            await signOut();
            router.replace('/sign-in');
        } catch {
            setSigningOut(false);
        }
    }

    function handleToggleTheme() {
        const next = isDark ? 'light' : 'dark';
        void setAccountTheme(accountThemeFromCss(next)).catch(error => {
            console.error('theme save failed', error);
        });
    }

    const activeGroup = resolveNavGroupForPath(pathname);
    const activeChild = resolveNavChildForPath(pathname);
    const access = accessForPath(pathname);
    const activePortalLabel =
        (activeGroup && (TOP_PILL_LABELS[activeGroup.key] ?? activeGroup.label)) || 'Home';

    return (
        <div className="min-h-dvh bg-bg bg-(image:--gradient-page) bg-top bg-no-repeat">
            {/* ── HEADER ──────────────────────────────────────────────────── */}
            <header className="sticky top-0 z-40 bg-chrome backdrop-blur-md">
                <div className="relative mx-auto flex h-16 max-w-7xl items-center px-4">
                    {/* Wordmark */}
                    <Link
                        href="/"
                        className="relative z-10 flex shrink-0 items-center"
                        data-tour="shell-brand">
                        <RumteloLogo variant="wordmark" className="h-7 w-auto max-w-[9.5rem]" />
                    </Link>

                    {/* Portal switcher — mobile dropdown */}
                    <div className="relative z-10 mx-3 min-w-0 flex-1 md:hidden">
                        <button
                            type="button"
                            onClick={() => {
                                setMenuOpen(false);
                                setSubOpen(false);
                                setPortalOpen(previous => !previous);
                            }}
                            aria-label="Switch product"
                            aria-expanded={portalOpen}
                            className="flex w-full max-w-[14rem] items-center justify-between gap-2 rounded-full border border-line-strong bg-sunken px-3.5 py-2 shadow-sm transition-colors hover:border-accent-hover">
                            <span className="flex min-w-0 items-center gap-2">
                                <span aria-hidden className="text-accent">
                                    {activeGroup?.icon ?? '◇'}
                                </span>
                                <span className="truncate font-mono text-xs font-semibold tracking-widest text-fg uppercase">
                                    {activePortalLabel}
                                </span>
                            </span>
                            <span
                                aria-hidden
                                className={cn(
                                    'text-fg-faint transition-transform duration-200',
                                    portalOpen && 'rotate-180'
                                )}>
                                ▾
                            </span>
                        </button>

                        {portalOpen && (
                            <>
                                <button
                                    type="button"
                                    aria-label="Close product menu"
                                    onClick={() => setPortalOpen(false)}
                                    className="fixed inset-0 z-30 cursor-default"
                                />
                                <div className="absolute top-11 left-0 z-40 w-[min(16.5rem,calc(100vw-2rem))] animate-rise overflow-hidden rounded-2xl border border-line-strong bg-surface p-1.5 shadow-xl">
                                    {NAV_GROUPS.map(group => {
                                        const active = group === activeGroup;
                                        return (
                                            <Link
                                                key={group.key}
                                                href={group.href}
                                                onClick={() => setPortalOpen(false)}
                                                className={cn(
                                                    'flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors',
                                                    active
                                                        ? 'bg-accent text-on-accent'
                                                        : 'text-fg hover:bg-raised'
                                                )}>
                                                <span
                                                    aria-hidden
                                                    className={cn(
                                                        'grid size-8 place-items-center rounded-full font-mono text-sm',
                                                        active
                                                            ? 'bg-on-accent/15'
                                                            : 'bg-sunken text-accent'
                                                    )}>
                                                    {group.icon}
                                                </span>
                                                <span className="font-mono text-xs font-semibold tracking-widest uppercase">
                                                    {TOP_PILL_LABELS[group.key] ?? group.label}
                                                </span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Portal pill bar — desktop, truly centered */}
                    <nav
                        className="pointer-events-none absolute inset-x-0 hidden justify-center md:flex"
                        aria-label="Main navigation">
                        <div className="pointer-events-auto flex items-center gap-0.5 rounded-full border border-line bg-sunken p-1 shadow-md">
                            {NAV_GROUPS.map(group => {
                                const active = group === activeGroup;
                                return (
                                    <Link
                                        key={group.key}
                                        href={group.href}
                                        className={cn(
                                            'flex items-center gap-1.5 rounded-full px-4 py-2 font-mono text-xs font-semibold tracking-widest uppercase transition-colors',
                                            active
                                                ? 'bg-accent text-on-accent'
                                                : 'text-fg-secondary hover:text-accent'
                                        )}>
                                        <span aria-hidden>{group.icon}</span>
                                        {TOP_PILL_LABELS[group.key] ?? group.label}
                                    </Link>
                                );
                            })}
                        </div>
                    </nav>

                    {/* Avatar menu (language + theme live here) */}
                    <div className="relative z-10 ml-auto shrink-0">
                        <button
                            type="button"
                            onClick={() => {
                                setPortalOpen(false);
                                setSubOpen(false);
                                setMenuOpen(previous => !previous);
                            }}
                            aria-label="User menu"
                            aria-expanded={menuOpen}
                            className="grid size-9 place-items-center rounded-full bg-accent font-mono text-xs font-bold text-on-accent transition hover:brightness-110 active:scale-95">
                            {userInitials}
                        </button>

                        {menuOpen && (
                            <>
                                <button
                                    type="button"
                                    aria-label="Close menu"
                                    onClick={() => setMenuOpen(false)}
                                    className="fixed inset-0 z-30 cursor-default"
                                />
                                <div className="absolute top-11 right-0 z-40 w-[min(18rem,calc(100vw-2rem))] animate-rise overflow-hidden rounded-2xl border border-line-strong bg-surface shadow-xl">
                                    {/* User row */}
                                    <div className="flex items-center gap-3 border-b border-line px-4.5 py-4">
                                        <div className="grid size-9.5 shrink-0 place-items-center rounded-full bg-accent font-mono text-xs font-bold text-on-accent">
                                            {userInitials}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-fg">
                                                {userName}
                                            </p>
                                            <p className="truncate font-mono text-xs text-fg-faint">
                                                {userEmail || '—'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid gap-0.5 border-b border-line p-2">
                                        <button
                                            type="button"
                                            onClick={toggleLocale}
                                            className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-raised">
                                            <span className="grid gap-0.5">
                                                <span className="text-sm text-fg">Language</span>
                                                <span className="text-xs leading-tight text-fg-faint">
                                                    App language
                                                </span>
                                            </span>
                                            <span className="rounded-full border border-line px-2.5 py-1 font-mono text-xs font-semibold tracking-wide text-fg-muted uppercase">
                                                {localeLabel}
                                            </span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleToggleTheme}
                                            className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-raised">
                                            <span className="grid gap-0.5">
                                                <span className="text-sm text-fg">Appearance</span>
                                                <span className="text-xs leading-tight text-fg-faint">
                                                    Light or dark
                                                </span>
                                            </span>
                                            <span
                                                className="rounded-full border border-line px-2.5 py-1 font-mono text-xs font-semibold tracking-wide text-fg-muted"
                                                suppressHydrationWarning>
                                                {isDark ? '☾ Dark' : '☀ Light'}
                                            </span>
                                        </button>
                                    </div>

                                    <div className="grid gap-0.5 p-2">
                                        {MENU_ITEMS.map(item => {
                                            const isPlan = item.href === '/settings/general/plan';
                                            const inner = (
                                                <>
                                                    <span className="grid min-w-0 flex-1 gap-0.5">
                                                        <span
                                                            className={cn(
                                                                'text-sm',
                                                                item.danger
                                                                    ? 'text-danger'
                                                                    : 'text-fg'
                                                            )}>
                                                            {item.label}
                                                        </span>
                                                        <span className="text-xs leading-tight text-fg-faint">
                                                            {item.sub}
                                                        </span>
                                                    </span>
                                                    {isPlan ? (
                                                        <span className="shrink-0 rounded-full border border-line px-2.5 py-1 font-mono text-xs font-semibold tracking-wide text-fg-muted">
                                                            {planLabel}
                                                        </span>
                                                    ) : null}
                                                </>
                                            );

                                            if (item.href) {
                                                const href =
                                                    item.href === '__settings__'
                                                        ? settingsHrefForPathname(pathname)
                                                        : item.href;
                                                return (
                                                    <Link
                                                        key={item.label}
                                                        href={href}
                                                        onClick={() => setMenuOpen(false)}
                                                        className={cn(
                                                            'rounded-lg px-3 py-2.5 transition-colors hover:bg-raised',
                                                            isPlan
                                                                ? 'flex items-center justify-between gap-3'
                                                                : 'grid gap-0.5'
                                                        )}>
                                                        {inner}
                                                    </Link>
                                                );
                                            }

                                            return (
                                                <button
                                                    key={item.label}
                                                    type="button"
                                                    disabled={signingOut}
                                                    onClick={() => void handleSignOut()}
                                                    className="grid w-full gap-0.5 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-raised">
                                                    {inner}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Subnav (portal children) */}
                {activeGroup && (
                    <div className={cn('border-t-2 bg-bg-app', SUBNAV_TINT[activeGroup.key])}>
                        <div className="mx-auto flex max-w-7xl items-center gap-1.5 px-4 py-2.5">
                            {/* Desktop pill strip */}
                            <div className="hidden flex-wrap items-center gap-1.5 sm:flex">
                                {activeGroup.children.map(child => {
                                    const active = activeChild?.href === child.href;
                                    const locked = isCapabilityLocked(child.capabilityKey);
                                    return (
                                        <Link
                                            key={child.href}
                                            href={child.href}
                                            className={cn(
                                                'rounded-full border px-3.5 py-1.5 font-mono text-xs font-medium tracking-wide uppercase transition-colors',
                                                active
                                                    ? 'border-accent-hover bg-accent-soft text-accent'
                                                    : 'border-line text-fg-muted hover:border-accent-hover hover:text-accent',
                                                locked && !active && 'opacity-55'
                                            )}>
                                            {locked && (
                                                <span aria-hidden className="mr-1 text-xs">
                                                    🔒
                                                </span>
                                            )}
                                            {child.label}
                                        </Link>
                                    );
                                })}
                            </div>

                            {/* Mobile dropdown */}
                            <div className="relative min-w-0 sm:hidden">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPortalOpen(false);
                                        setMenuOpen(false);
                                        setSubOpen(previous => !previous);
                                    }}
                                    className="flex max-w-[min(100%,14rem)] items-center gap-2 rounded-full border border-line-strong px-3.5 py-2 font-mono text-xs font-semibold tracking-wide text-fg uppercase">
                                    <span className="truncate">
                                        {activeChild &&
                                        activeGroup.children.some(
                                            navChild => navChild.href === activeChild.href
                                        )
                                            ? activeChild.label
                                            : activeGroup.children[0].label}
                                    </span>
                                    <span className="shrink-0 text-xs opacity-70" aria-hidden>
                                        ▾
                                    </span>
                                </button>
                                {subOpen && (
                                    <div className="absolute top-10 left-0 z-40 grid w-[min(16rem,calc(100vw-2rem))] animate-rise gap-0.5 rounded-xl border border-line-strong bg-surface p-1.5 shadow-xl">
                                        {activeGroup.children.map(child => {
                                            const locked = isCapabilityLocked(child.capabilityKey);
                                            return (
                                                <Link
                                                    key={child.href}
                                                    href={child.href}
                                                    onClick={() => setSubOpen(false)}
                                                    className={cn(
                                                        'rounded-lg px-3 py-2.5 text-sm text-fg transition-colors hover:bg-raised',
                                                        locked && 'opacity-55'
                                                    )}>
                                                    {locked && (
                                                        <span aria-hidden className="mr-1 text-xs">
                                                            🔒
                                                        </span>
                                                    )}
                                                    {child.label}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Period selector + Help + Settings */}
                            <div className="ml-auto flex shrink-0 items-center gap-2">
                                <div data-tour="shell-period">
                                    <PeriodSelector />
                                </div>
                                <PageHelpButton />
                                <Link
                                    href={settingsHrefForPathname(pathname)}
                                    className="hidden items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 font-mono text-xs font-medium tracking-wide text-fg-faint uppercase transition-colors hover:border-accent-hover hover:text-accent sm:flex">
                                    <span aria-hidden>◇</span>
                                    Settings
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </header>

            {/* ── MAIN ─────────────────────────────────────────────────────── */}
            <div className="mx-auto max-w-7xl px-4 py-8 pb-24 md:pb-8">
                {!access.locked && <PeriodTravelBanner />}
                <WhyCaption pathname={pathname} locked={access.locked} />
                <main className="min-w-0">
                    <CapabilityGate>{children}</CapabilityGate>
                </main>
            </div>

            {/* ── BOTTOM NAV (mobile) ───────────────────────────────────────── */}
            <nav
                className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-line bg-chrome pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
                aria-label="Mobile navigation">
                {BOTTOM_TABS.map((tab, i) => {
                    const active = NAV_GROUPS[i] === activeGroup;
                    return (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            className={cn(
                                'flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium',
                                active ? 'text-accent' : 'text-fg-muted'
                            )}>
                            <span aria-hidden className="text-base">
                                {tab.glyph}
                            </span>
                            {tab.label}
                        </Link>
                    );
                })}
            </nav>

            {/* ── OVERLAYS ─────────────────────────────────────────────────── */}
            <QuickAddFab />
            <ToastPill />
            <OnboardingOverlay />
            <PendingPlanCheckout />
        </div>
    );
}
