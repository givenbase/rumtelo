'use client';

import { useEffect, type ReactNode } from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { RumteloLogo } from '@rumtelo/brand';
import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations } from '@rumtelo/i18n';
import { BrandLoader } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { apiQuery } from '@/app/_lib/api-hooks';
import {
    clearPracticePreviewUnlessEntering,
    forceClearPracticePreview,
} from '@/app/_lib/practice-preview';
import { practicePath } from '@/app/_lib/routes';

import { PracticeAccountMenu } from './practice-account-menu';
import { PracticeContextProvider, usePractice } from './practice-context';

type NavItem = {
    href: string;
    labelKey: string;
    matchExact?: boolean;
};

const NAV_ITEMS: NavItem[] = [
    { href: practicePath(), labelKey: 'pages.practice.nav.overview', matchExact: true },
    { href: practicePath('clients'), labelKey: 'pages.practice.nav.clients' },
    { href: practicePath('staff'), labelKey: 'pages.practice.nav.staff' },
];

function isNavActive(pathname: string, href: string, matchExact?: boolean): boolean {
    const path = pathname.replace(/^\/(en|nl|es|fr)(?=\/|$)/, '') || '/';
    if (matchExact) return path === href;
    return path === href || path.startsWith(`${href}/`);
}

function PracticeShellInner({ children }: { children: ReactNode }) {
    const t = useTranslations();
    const pathname = usePathname();
    const { activePractice, isLoading } = usePractice();

    // Drop leftover coach preview when landing on Practice control plane.
    // Immediate clear (unless open-board suppress) + hard clear after suppress window
    // so browser-back cannot leave client headers armed for a later `/` visit.
    useEffect(() => {
        const immediate = window.setTimeout(() => {
            clearPracticePreviewUnlessEntering();
        }, 0);
        const hard = window.setTimeout(() => {
            forceClearPracticePreview();
        }, 2_100);
        return () => {
            window.clearTimeout(immediate);
            window.clearTimeout(hard);
        };
    }, []);

    const companyName =
        activePractice?.displayName?.trim() ||
        activePractice?.legalName?.trim() ||
        t('pages.practice.nav.practice_label_short');
    const legalName = activePractice?.legalName?.trim() || null;
    const showLegalName = Boolean(legalName && legalName !== companyName);

    return (
        <div className="flex min-h-dvh flex-col bg-bg bg-(image:--gradient-page) bg-top bg-no-repeat">
            <header className="sticky top-0 z-40 border-b border-line bg-chrome/95 backdrop-blur-md">
                <div className="mx-auto flex min-h-14 max-w-6xl items-center gap-3 px-4 py-2">
                    {/*
                      Brand groups:
                      1) Rumtelo product mark
                      2) Rumtelo Practice plane
                      3) This company’s practice name (+ legal name when distinct)
                    */}
                    <Link
                        href={practicePath()}
                        className="flex min-w-0 items-center gap-3"
                        aria-label={`${t('pages.practice.nav.practice_label')} — ${companyName}`}>
                        <RumteloLogo
                            variant="wordmark"
                            className="h-6 w-auto max-w-[8.5rem] shrink-0 sm:h-7 sm:max-w-[9.5rem]"
                        />
                        <span aria-hidden className="hidden h-8 w-px shrink-0 bg-line sm:block" />
                        <span className="min-w-0">
                            <span className="block truncate font-mono text-[10px] font-medium tracking-[0.14em] text-accent uppercase">
                                {t('pages.practice.nav.practice_label')}
                            </span>
                            <span className="block truncate text-sm font-semibold text-fg">
                                {isLoading ? '…' : companyName}
                            </span>
                            {showLegalName && !isLoading ? (
                                <span className="mt-0.5 block truncate text-[11px] text-fg-muted">
                                    {legalName}
                                </span>
                            ) : null}
                        </span>
                    </Link>

                    <nav
                        aria-label={t('pages.practice.nav.practice_label')}
                        className="ml-auto hidden items-center gap-0.5 md:flex">
                        {NAV_ITEMS.map(item => {
                            const active = isNavActive(pathname, item.href, item.matchExact);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        'rounded-full px-3.5 py-1.5 font-mono text-[10px] font-medium tracking-[0.12em] uppercase transition-colors',
                                        active
                                            ? 'bg-accent text-on-accent'
                                            : 'text-fg-secondary hover:text-fg'
                                    )}>
                                    {t(item.labelKey)}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="ml-auto shrink-0 md:ml-2">
                        <PracticeAccountMenu />
                    </div>
                </div>

                <nav
                    aria-label={t('pages.practice.nav.practice_label')}
                    className="-mx-1 flex gap-1.5 overflow-x-auto border-t border-line/50 px-4 pt-2 pb-2 md:hidden">
                    {NAV_ITEMS.map(item => {
                        const active = isNavActive(pathname, item.href, item.matchExact);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    'shrink-0 rounded-full border px-3 py-1.5 text-xs whitespace-nowrap',
                                    active
                                        ? 'border-accent bg-accent-soft font-medium text-accent'
                                        : 'border-line text-fg-secondary hover:border-accent/40 hover:text-fg'
                                )}>
                                {t(item.labelKey)}
                            </Link>
                        );
                    })}
                </nav>
            </header>

            <main className="flex-1">
                <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-10">{children}</div>
            </main>
        </div>
    );
}

export function PracticeShell({ children }: { children: ReactNode }) {
    const practiceListQuery = useLiveQuery(apiQuery.practice.list.queryOptions(), [], true);
    const practices = practiceListQuery.data ?? [];
    const isLoading = practiceListQuery.isPending;

    return (
        <PracticeContextProvider practices={practices} isLoading={isLoading}>
            {isLoading ? (
                <div className="flex min-h-dvh items-center justify-center">
                    <BrandLoader label="Loading practice…" />
                </div>
            ) : (
                <PracticeShellInner>{children}</PracticeShellInner>
            )}
        </PracticeContextProvider>
    );
}
