'use client';

import { Typography } from '@rumtelo/ui';
import { useTranslations } from '@rumtelo/i18n';

import { CARD, Eyebrow } from './landing-primitives';

const PRIMARY_BOOK_KEYS = ['rich_dad', 'think_grow', 'millionaire_mind'] as const;
const MORE_BOOK_KEYS = ['psychology', 'secret'] as const;

/**
 * Why we exist — one spine:
 *   founded for ourselves → grounded in proven books → brought to market for others.
 * Quote follows locale (no dual nl/en display).
 */
export function LandingWhy() {
    const t = useTranslations('pages.landing.why');

    return (
        <section id="why" className="border-y border-line bg-bg-app">
            <div className="mx-auto max-w-6xl px-4 py-12 lg:px-6 lg:py-20">
                <div className="grid gap-10 lg:grid-cols-[minmax(0,6fr)_minmax(0,6fr)] lg:gap-14">
                    <div className="min-w-0">
                        <Eyebrow>{t('eyebrow')}</Eyebrow>
                        <blockquote className="mt-4">
                            <Typography as="h2" size="lg" className="max-w-2xl leading-[1.08]">
                                {t('quote')}
                            </Typography>
                        </blockquote>
                        <Typography as="p" variant="lead" className="mt-6">
                            {t('body')}
                        </Typography>
                        <p className="mt-5 font-mono text-xs font-medium tracking-wide text-fg-faint">
                            {t('signature')}
                        </p>

                        <div className="mt-8 flex flex-col gap-2 border-t border-line pt-6 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-6">
                            <Typography as="h3" size="lg">
                                {t('manifesto')}
                            </Typography>
                            <Typography as="span" size="sm" color="muted">
                                {t('audience')}
                            </Typography>
                        </div>
                    </div>

                    <div className="min-w-0">
                        <Typography as="span" variant="eyebrow" color="primary">
                            ✦ {t('books_eyebrow')}
                        </Typography>
                        <Typography
                            as="p"
                            size="sm"
                            color="muted"
                            className="mt-3 max-w-prose text-pretty">
                            {t('books_lead')}
                        </Typography>
                        <ul className="mt-6 grid gap-3">
                            {PRIMARY_BOOK_KEYS.map(bookKey => (
                                <li key={bookKey} className={`${CARD} grid gap-1 p-4`}>
                                    <span className="text-sm font-semibold text-fg">
                                        {t(`books.${bookKey}.title`)}
                                    </span>
                                    <span className="font-mono text-xs text-fg-faint">
                                        {t(`books.${bookKey}.author`)}
                                    </span>
                                    <span className="text-sm text-fg-secondary">
                                        {t(`books.${bookKey}.line`)}
                                    </span>
                                </li>
                            ))}
                            {MORE_BOOK_KEYS.length > 0 ? (
                                <details className="group">
                                    <summary className="cursor-pointer font-mono text-xs tracking-wide text-accent uppercase">
                                        {t('more_books')}
                                    </summary>
                                    <ul className="mt-3 grid gap-3">
                                        {MORE_BOOK_KEYS.map(bookKey => (
                                            <li key={bookKey} className={`${CARD} grid gap-1 p-4`}>
                                                <span className="text-sm font-semibold text-fg">
                                                    {t(`books.${bookKey}.title`)}
                                                </span>
                                                <span className="font-mono text-xs text-fg-faint">
                                                    {t(`books.${bookKey}.author`)}
                                                </span>
                                                <span className="text-sm text-fg-secondary">
                                                    {t(`books.${bookKey}.line`)}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </details>
                            ) : null}
                        </ul>
                    </div>
                </div>
            </div>
        </section>
    );
}
