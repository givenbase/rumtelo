'use client';

import { useTranslations } from '@rumtelo/i18n';
import { Typography } from '@rumtelo/ui';

import { Eyebrow } from '@/components/landing/landing-primitives';

import { PracticeCta } from './practice-cta';

export function PracticesHero() {
    const t = useTranslations('pages.practices.hero');

    return (
        <section className="relative overflow-hidden border-b border-line">
            <span className="pointer-events-none absolute inset-[-20%_-10%] bg-(image:--gradient-page) opacity-40" />
            <div className="relative z-10 mx-auto max-w-6xl px-4 py-14 lg:px-6 lg:py-24">
                <div className="max-w-2xl min-w-0 animate-[rise_520ms_var(--ease-out)_both]">
                    <Eyebrow>{t('eyebrow')}</Eyebrow>
                    <Typography
                        as="h1"
                        size="lg"
                        weight="bold"
                        className="my-4 max-w-xl leading-[1.05] text-balance sm:leading-[1.02]">
                        {t('headline')}
                    </Typography>
                    <Typography as="p" variant="lead" className="mb-7">
                        {t('lead')}
                    </Typography>
                    <div className="grid justify-items-start gap-2.5">
                        <PracticeCta className="w-full sm:w-auto" />
                        <p className="text-sm text-fg-muted">{t('microline')}</p>
                    </div>
                </div>
            </div>
        </section>
    );
}
