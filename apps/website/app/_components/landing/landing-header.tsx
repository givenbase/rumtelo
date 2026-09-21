'use client';

import { useEffect, useId, useState } from 'react';
import Link from 'next/link';

import { RumteloLogo } from '@rumtelo/brand';
import { AccountThemeToggle } from '@/app/_components/account-theme-sync';

import {
    initialsFromUser,
    useMarketingSession,
} from '@/app/_components/marketing-session-provider';
import { appHomeUrl, appPlanSettingsUrl, appSignInUrl, webSignUpPath } from '@/lib/portal-urls';
import { isRegistrationOpen } from '@/lib/maintenance';

import { Cta } from './landing-primitives';

const NAV_LINKS = [
    { href: '#portals', label: 'Portals' },
    { href: '#jars', label: 'How it works' },
    { href: '#pricing', label: 'Pricing' },
    { href: '#faq', label: 'Questions' },
    { href: '#signup', label: 'Create account' },
] as const;

const PLAN_SHORT = { BASIC: 'Basic', PLUS: 'Plus', MAX: 'Max' } as const;

export function LandingHeader() {
    const [open, setOpen] = useState(false);
    const [accountOpen, setAccountOpen] = useState(false);
    const menuId = useId();
    const { isPending, isAuthenticated, user, planKey, signOut } = useMarketingSession();

    useEffect(() => {
        if (!open) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };
        document.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prev;
        };
    }, [open]);

    useEffect(() => {
        const mq = window.matchMedia('(min-width: 1024px)');
        const onChange = () => {
            if (mq.matches) setOpen(false);
        };
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);

    useEffect(() => {
        if (!accountOpen) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setAccountOpen(false);
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [accountOpen]);

    const close = () => setOpen(false);
    const registrationOpen = isRegistrationOpen();
    const navLinks = NAV_LINKS.filter(link => registrationOpen || link.href !== '#signup').map(
        link =>
            link.href === '#signup' && isAuthenticated
                ? { href: appHomeUrl(), label: 'Dashboard' }
                : link
    );

    const name = user?.name?.trim() || 'Account';
    const email = user?.email?.trim() || '';
    const initials = initialsFromUser(user?.name, user?.email);
    const planLabel = planKey ? PLAN_SHORT[planKey] : null;

    return (
        <header className="sticky top-0 z-20 border-b border-line bg-chrome/95 backdrop-blur-md">
            <div className="mx-auto flex w-full max-w-6xl min-w-0 items-center gap-3 px-4 py-3 sm:gap-4 lg:px-6">
                <Link href="/" className="min-w-0 shrink" onClick={close}>
                    <RumteloLogo
                        variant="wordmark"
                        className="h-6 w-auto max-w-34 sm:h-7 sm:max-w-38"
                    />
                </Link>

                <nav
                    aria-label="Primary"
                    className="ml-auto hidden items-center gap-5 lg:flex xl:gap-6">
                    {navLinks
                        .filter(link => link.href !== '#signup' && !link.href.startsWith('http'))
                        .map(link => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="text-sm whitespace-nowrap text-fg-muted transition-colors hover:text-accent">
                                {link.label}
                            </Link>
                        ))}
                </nav>

                <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2 lg:ml-4">
                    <AccountThemeToggle className="size-9 shrink-0 rounded-full bg-transparent text-sm text-fg-muted hover:border-accent hover:bg-transparent hover:text-accent sm:size-8" />

                    {!isPending && isAuthenticated ? (
                        <>
                            <Cta
                                href={appHomeUrl()}
                                className="hidden whitespace-nowrap sm:inline-flex">
                                Open app
                            </Cta>

                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setAccountOpen(previous => !previous)}
                                    aria-label="Account menu"
                                    aria-expanded={accountOpen}
                                    className="relative grid size-9 place-items-center overflow-hidden rounded-full bg-accent font-mono text-xs font-bold text-on-accent transition hover:brightness-110 active:scale-95">
                                    {user?.image ? (
                                        // eslint-disable-next-line @next/next/no-img-element -- session avatar URL is arbitrary
                                        <img
                                            src={user.image}
                                            alt=""
                                            className="size-9 object-cover"
                                        />
                                    ) : (
                                        initials
                                    )}
                                </button>

                                {accountOpen ? (
                                    <>
                                        <button
                                            type="button"
                                            aria-label="Close account menu"
                                            onClick={() => setAccountOpen(false)}
                                            className="fixed inset-0 z-30 cursor-default"
                                        />
                                        <div className="absolute top-11 right-0 z-40 w-[min(18rem,calc(100vw-2rem))] animate-rise overflow-hidden rounded-2xl border border-line-strong bg-surface shadow-xl">
                                            <div className="flex items-center gap-3 border-b border-line px-4.5 py-4">
                                                <div className="grid size-9.5 shrink-0 place-items-center overflow-hidden rounded-full bg-accent font-mono text-xs font-bold text-on-accent">
                                                    {user?.image ? (
                                                        // eslint-disable-next-line @next/next/no-img-element -- session avatar URL is arbitrary
                                                        <img
                                                            src={user.image}
                                                            alt=""
                                                            className="size-9.5 object-cover"
                                                        />
                                                    ) : (
                                                        initials
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-medium text-fg">
                                                        {name}
                                                    </p>
                                                    <p className="truncate font-mono text-xs text-fg-faint">
                                                        {email || '—'}
                                                    </p>
                                                    {planLabel ? (
                                                        <p className="mt-1 font-mono text-[11px] font-semibold tracking-wide text-accent uppercase">
                                                            {planLabel} plan
                                                        </p>
                                                    ) : null}
                                                </div>
                                            </div>
                                            <div className="grid gap-0.5 p-2">
                                                <Link
                                                    href={appHomeUrl()}
                                                    onClick={() => setAccountOpen(false)}
                                                    className="grid gap-0.5 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-raised">
                                                    <span className="text-sm text-fg">
                                                        Open dashboard
                                                    </span>
                                                    <span className="text-xs text-fg-faint">
                                                        Continue in the app
                                                    </span>
                                                </Link>
                                                <Link
                                                    href={appPlanSettingsUrl()}
                                                    onClick={() => setAccountOpen(false)}
                                                    className="grid gap-0.5 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-raised">
                                                    <span className="text-sm text-fg">
                                                        Plan & billing
                                                    </span>
                                                    <span className="text-xs text-fg-faint">
                                                        Upgrade, downgrade or manage
                                                    </span>
                                                </Link>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setAccountOpen(false);
                                                        void signOut();
                                                    }}
                                                    className="grid gap-0.5 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-raised">
                                                    <span className="text-sm text-danger">
                                                        Sign out
                                                    </span>
                                                    <span className="text-xs text-fg-faint">
                                                        Leave this browser session
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                ) : null}
                            </div>
                        </>
                    ) : (
                        <>
                            <Cta
                                href={appSignInUrl()}
                                variant="ghost"
                                className="hidden whitespace-nowrap sm:inline-flex">
                                Sign in
                            </Cta>

                            {registrationOpen ? (
                                <Cta
                                    href={webSignUpPath()}
                                    className="hidden whitespace-nowrap sm:inline-flex">
                                    Start free
                                </Cta>
                            ) : null}
                        </>
                    )}

                    <button
                        type="button"
                        className="grid size-9 shrink-0 place-items-center rounded-full border border-line text-fg-muted transition-colors hover:border-accent hover:text-accent lg:hidden"
                        aria-expanded={open}
                        aria-controls={menuId}
                        aria-label={open ? 'Close menu' : 'Open menu'}
                        onClick={() => setOpen(previous => !previous)}>
                        <span className="relative block size-4" aria-hidden>
                            <span
                                className={`absolute inset-x-0 top-0.5 h-0.5 rounded-full bg-current transition-transform ${
                                    open ? 'translate-y-1.5 rotate-45' : ''
                                }`}
                            />
                            <span
                                className={`absolute inset-x-0 top-1.75 h-0.5 rounded-full bg-current transition-opacity ${
                                    open ? 'opacity-0' : ''
                                }`}
                            />
                            <span
                                className={`absolute inset-x-0 top-3.25 h-0.5 rounded-full bg-current transition-transform ${
                                    open ? '-translate-y-1.5 -rotate-45' : ''
                                }`}
                            />
                        </span>
                    </button>
                </div>
            </div>

            <div id={menuId} hidden={!open} className="border-t border-line bg-chrome lg:hidden">
                <nav
                    aria-label="Mobile"
                    className="mx-auto flex w-full max-w-6xl flex-col gap-0.5 px-4 py-3 pb-5">
                    {navLinks.map(link => (
                        <Link
                            key={link.href}
                            href={link.href}
                            onClick={close}
                            className="rounded-lg px-3 py-3.5 text-base text-fg-muted transition-colors hover:bg-raised hover:text-accent">
                            {link.label}
                        </Link>
                    ))}
                    <div className="mt-3 grid gap-2 border-t border-line pt-4 sm:hidden">
                        {isAuthenticated ? (
                            <>
                                <Cta
                                    href={appHomeUrl()}
                                    size="lg"
                                    className="w-full"
                                    onClick={close}>
                                    Open dashboard
                                </Cta>
                                <Cta
                                    href={appPlanSettingsUrl()}
                                    variant="ghost"
                                    size="lg"
                                    className="w-full"
                                    onClick={close}>
                                    Plan & billing
                                </Cta>
                            </>
                        ) : (
                            <>
                                <Cta
                                    href={appSignInUrl()}
                                    variant="ghost"
                                    size="lg"
                                    className="w-full"
                                    onClick={close}>
                                    Sign in
                                </Cta>
                                {registrationOpen ? (
                                    <Cta
                                        href={webSignUpPath()}
                                        size="lg"
                                        className="w-full"
                                        onClick={close}>
                                        Start free — no card
                                    </Cta>
                                ) : null}
                            </>
                        )}
                    </div>
                </nav>
            </div>
        </header>
    );
}
