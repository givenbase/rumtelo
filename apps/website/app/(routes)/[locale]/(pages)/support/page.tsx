import type { Metadata } from 'next';
import Link from 'next/link';

import { getTranslations } from '@rumtelo/i18n';

import { SupportPage } from '@/components/support/support-page';

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('pages.support.hub');
    return {
        title: `${t('title')} · Rumtelo`,
        description: t('description'),
    };
}

const HUB_CARDS = [
    {
        key: 'legal' as const,
        href: '/legal',
    },
    {
        key: 'contact' as const,
        href: '/support/contact',
    },
] as const;

export default async function SupportHubPage() {
    const t = await getTranslations('pages.support.hub');

    return (
        <SupportPage title={t('title')} description={t('description')}>
            <div className="grid gap-4 sm:grid-cols-2">
                {HUB_CARDS.map(card => (
                    <Link
                        key={card.key}
                        href={card.href}
                        className="group flex flex-col gap-3 rounded-xl border border-line bg-chrome p-6 transition-colors hover:border-accent/40">
                        <span className="font-display text-lg font-semibold tracking-tight text-fg">
                            {t(`cards.${card.key}.title`)}
                        </span>
                        <span className="text-sm leading-relaxed text-fg-secondary">
                            {t(`cards.${card.key}.body`)}
                        </span>
                        <span className="mt-auto text-sm font-medium text-accent group-hover:underline">
                            {t(`cards.${card.key}.cta`)} →
                        </span>
                    </Link>
                ))}
            </div>
        </SupportPage>
    );
}
