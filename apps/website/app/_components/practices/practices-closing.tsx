'use client';

import { useTranslations } from '@rumtelo/i18n';

import { SectionHeading } from '@/components/landing/landing-primitives';

import { PracticeCta } from './practice-cta';

export function PracticesClosing() {
    const t = useTranslations('pages.practices.closing');
    const tHero = useTranslations('pages.practices.hero');

    return (
        <section className="border-t border-line bg-bg-app">
            <div className="mx-auto grid max-w-6xl justify-items-start gap-6 px-4 py-12 lg:px-6 lg:py-20">
                <SectionHeading
                    eyebrow={tHero('eyebrow')}
                    headline={t('headline')}
                    lead={t('lead')}
                    headlineClassName="max-w-lg"
                />
                <PracticeCta className="w-full sm:w-auto" />
            </div>
        </section>
    );
}
