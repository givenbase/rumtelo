'use client';

import Link from 'next/link';

import { RumteloLogo } from '@rumtelo/brand';
import { useTranslations } from '@rumtelo/i18n';
import { Typography } from '@rumtelo/ui';

import { TRUST_BADGE_KEYS } from '@/lib/landing-content';

import { LandingIcon } from './landing-icon';

const TRUST_KEYS = [
    { key: 'readonly', icon: 'eye' as const },
    { key: 'eu', icon: 'shield' as const },
    { key: 'yours', icon: 'db' as const },
    { key: 'coach', icon: 'compass' as const },
] as const;

const FOOT_COL_DEFS = [
    {
        headKey: 'product' as const,
        links: [
            { textKey: 'portals' as const, href: '#portals' },
            { textKey: 'jars' as const, href: '#jars' },
            { textKey: 'coach' as const, href: '#coach' },
            { textKey: 'pricing' as const, href: '#pricing' },
        ],
    },
    {
        headKey: 'company' as const,
        links: [
            { textKey: 'why' as const, href: '#why' },
            { textKey: 'principles' as const, href: '#principles' },
            { textKey: 'questions' as const, href: '#faq' },
        ],
    },
    {
        headKey: 'legal' as const,
        links: [
            { textKey: 'privacy' as const, href: '/privacy' },
            { textKey: 'terms' as const, href: '/terms' },
            { textKey: 'data_processing' as const, href: '/data-processing' },
        ],
    },
    {
        headKey: 'contact' as const,
        links: [
            { textKey: 'support' as const, href: 'mailto:support@rumtelo.com' },
            { textKey: 'press' as const, href: 'mailto:hello@rumtelo.com' },
        ],
    },
] as const;

/** Client footer — landing page is a Client Component tree; use `useTranslations`. */
export function LandingFooter() {
    const t = useTranslations();
    const year = new Date().getFullYear();

    return (
        <footer className="border-t border-line bg-bg-app">
            <div className="mx-auto w-full max-w-6xl px-4 pt-8 lg:px-6">
                <div className="grid grid-cols-1 gap-4 border-b border-line pb-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-3.5">
                    {TRUST_KEYS.map(card => (
                        <div key={card.key} className="flex min-w-0 items-start gap-3">
                            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
                                <LandingIcon name={card.icon} size={18} />
                            </span>
                            <span className="grid min-w-0 gap-0.5">
                                <span className="text-sm font-semibold text-fg-strong">
                                    {t(`pages.landing.footer.trust.${card.key}.head`)}
                                </span>
                                <span className="text-xs leading-relaxed text-fg-faint">
                                    {t(`pages.landing.footer.trust.${card.key}.line`)}
                                </span>
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-8 lg:flex-row lg:items-start lg:gap-14 lg:px-6">
                <div className="grid w-full max-w-prose min-w-0 gap-3 lg:max-w-xs lg:flex-1">
                    <div className="grid gap-2">
                        <RumteloLogo variant="wordmark" className="h-6 w-auto max-w-34" />
                        <Typography
                            as="span"
                            variant="eyebrow"
                            color="muted"
                            className="text-fg-faint">
                            {t('features.brand.tagline')}
                        </Typography>
                    </div>
                    <span className="text-sm leading-relaxed text-pretty text-fg-faint">
                        {t('pages.landing.footer.attribution')}
                    </span>
                    <span className="text-xs leading-relaxed text-pretty text-fg-faint">
                        {t('pages.landing.footer.disclaimer')}
                    </span>
                </div>

                <nav
                    aria-label={t('pages.landing.footer.aria')}
                    className="grid w-full min-w-0 grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4 sm:gap-x-8 lg:flex-1 lg:justify-end">
                    {FOOT_COL_DEFS.map(col => (
                        <div key={col.headKey} className="grid min-w-0 content-start gap-2.5">
                            <Typography
                                as="span"
                                variant="eyebrow"
                                color="muted"
                                className="text-fg-faint">
                                {t(`pages.landing.footer.cols.${col.headKey}`)}
                            </Typography>
                            {col.links.map(link => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className="text-sm wrap-break-word text-fg-muted transition-colors hover:text-accent">
                                    {t(`pages.landing.footer.cols.${link.textKey}`)}
                                </Link>
                            ))}
                        </div>
                    ))}
                </nav>
            </div>

            <div className="border-t border-line">
                <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between lg:px-6">
                    <span className="font-mono text-xs font-medium tracking-normal text-fg-faint">
                        {t('pages.landing.footer.copyright', { year })}
                    </span>
                    <div className="flex max-w-full flex-wrap gap-2">
                        {TRUST_BADGE_KEYS.map(badgeKey => (
                            <span
                                key={badgeKey}
                                className="flex max-w-full items-center gap-1.5 rounded-full border border-line px-2.5 py-1.5 sm:px-3">
                                <span className="size-1.5 shrink-0 rounded-full bg-success" />
                                <span className="font-mono text-[10px] font-medium tracking-wide text-fg-muted sm:text-xs sm:tracking-widest">
                                    {t(`pages.landing.footer.badges.${badgeKey}`)}
                                </span>
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    );
}
