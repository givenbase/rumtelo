import type { Metadata } from 'next';
import Link from 'next/link';

import { getTranslations } from '@rumtelo/i18n';

import { SupportPage } from '@/components/support/support-page';

import { ContactForm } from './_components/contact-form';

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('pages.support.contact');
    return {
        title: `${t('title')} · Rumtelo`,
        description: t('description'),
    };
}

const EXPECT_KEYS = ['response', 'privacy', 'legal'] as const;
const CHANNEL_KEYS = ['support', 'press'] as const;

export default async function SupportContactPage() {
    const t = await getTranslations('pages.support.contact');

    return (
        <SupportPage title={t('title')} description={t('description')}>
            <section className="grid gap-4">
                <h2 className="font-display text-xl font-semibold tracking-tight text-fg">
                    {t('form_kicker')}
                </h2>
                <ContactForm />
            </section>

            <section className="mt-10 grid gap-4">
                <h2 className="font-display text-xl font-semibold tracking-tight text-fg">
                    {t('expect_kicker')}
                </h2>
                <ul className="grid gap-4">
                    {EXPECT_KEYS.map(key => (
                        <li key={key} className="rounded-xl border border-line bg-chrome p-5">
                            <p className="font-semibold text-fg">{t(`expect.${key}.title`)}</p>
                            <p className="mt-1.5 text-sm leading-relaxed text-fg-secondary">
                                {t(`expect.${key}.body`)}
                            </p>
                        </li>
                    ))}
                </ul>
            </section>

            <section className="mt-10 grid gap-4">
                <h2 className="font-display text-xl font-semibold tracking-tight text-fg">
                    {t('channels_kicker')}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                    {CHANNEL_KEYS.map(key => {
                        const email = t(`channels.${key}.email`);
                        return (
                            <div
                                key={key}
                                className="flex flex-col gap-3 rounded-xl border border-line bg-chrome p-6">
                                <div className="grid gap-1">
                                    <p className="font-display text-lg font-semibold tracking-tight text-fg">
                                        {t(`channels.${key}.title`)}
                                    </p>
                                    <p className="text-sm leading-relaxed text-fg-secondary">
                                        {t(`channels.${key}.body`)}
                                    </p>
                                </div>
                                <a
                                    href={`mailto:${email}`}
                                    className="mt-auto text-sm font-medium text-accent hover:underline">
                                    {t(`channels.${key}.cta`)} →
                                </a>
                                <a
                                    href={`mailto:${email}`}
                                    className="font-mono text-xs text-fg-faint hover:text-accent">
                                    {email}
                                </a>
                            </div>
                        );
                    })}
                </div>
                <p className="text-sm text-fg-faint">{t('location')}</p>
            </section>

            <div className="mt-12 flex flex-col items-start gap-3 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-fg-faint">{t('legal_kicker')}</p>
                <Link href="/legal" className="text-sm font-medium text-accent hover:underline">
                    {t('legal_cta')} →
                </Link>
            </div>
        </SupportPage>
    );
}
