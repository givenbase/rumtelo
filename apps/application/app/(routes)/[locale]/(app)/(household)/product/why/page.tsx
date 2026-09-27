import Link from 'next/link';

import { getTranslations } from '@rumtelo/i18n';
import { Card, Section, Typography } from '@rumtelo/ui';

import { isProductEnabled } from '@/app/_lib/launch-products';
import { productPath } from '@/app/_lib/routes';
import { PageContent } from '@/components/layout/page-content';

const MEANING_KEYS = [
    {
        lineKey: 'features.brand.core.two',
        bodyKey: 'pages.why.meaning.money_leaves_body',
    },
    {
        lineKey: 'pages.why.meaning.assign.line',
        bodyKey: 'pages.why.meaning.assign.body',
    },
    {
        lineKey: 'features.brand.auth_quotes_app.money_picture.headline',
        bodyKey: 'pages.why.meaning.direction.body',
    },
] as const;

const WIDER_PORTALS = [
    {
        product: 'money',
        portalKey: 'pages.nav.pills.money',
        lineKey: 'pages.why.portals.money.line',
        bodyKey: 'pages.why.portals.money.body',
        href: productPath('money/jars'),
    },
    {
        product: 'growth',
        portalKey: 'pages.nav.pills.growth',
        lineKey: 'pages.why.portals.growth.line',
        bodyKey: 'pages.why.portals.growth.body',
        href: productPath('growth/income'),
    },
    {
        product: 'energy',
        portalKey: 'pages.nav.pills.energy',
        lineKey: 'pages.why.portals.energy.line',
        bodyKey: 'pages.why.portals.energy.body',
        href: productPath('energy/week'),
    },
    {
        product: 'soul',
        portalKey: 'pages.nav.pills.soul',
        lineKey: 'pages.why.portals.soul.line',
        bodyKey: 'pages.why.portals.soul.body',
        href: productPath('soul/intent'),
    },
] as const;

export async function generateMetadata() {
    const t = await getTranslations('pages.why');
    return { title: t('title') };
}

/**
 * In-app manifesto — slogan first, then what we mean.
 * Brand: docs/brand/quotes.md · positioning.md
 */
export default async function WhyFoundationPage() {
    const t = await getTranslations();
    const wider = WIDER_PORTALS.filter(item => isProductEnabled(item.product));
    const launchWide = isProductEnabled('energy') || isProductEnabled('soul');

    return (
        <PageContent width="prose" className="animate-rise">
            <Section eyebrow={t('pages.why.eyebrow')}>
                <Typography as="p" variant="eyebrow" color="primary">
                    {t('pages.why.stand_on')}
                </Typography>
                <Typography
                    as="h1"
                    size="lg"
                    className="mt-3 text-4xl leading-[1.1] md:text-5xl lg:text-6xl">
                    {t('features.brand.tagline')}
                </Typography>
                <Typography as="p" variant="lead" size="lg" className="mt-5">
                    {t('pages.why.lead')}
                </Typography>
            </Section>

            <section className="mt-12 grid gap-6">
                <Typography as="span" variant="eyebrow" color="primary">
                    {t('pages.why.meaning_eyebrow')}
                </Typography>
                <div className="grid gap-4">
                    {MEANING_KEYS.map(item => (
                        <Card key={item.lineKey} className="grid gap-2 p-5">
                            <Typography as="h3" size="lg">
                                {t(item.lineKey)}
                            </Typography>
                            <Typography as="p" size="sm" color="secondary" className="text-pretty">
                                {t(item.bodyKey)}
                            </Typography>
                        </Card>
                    ))}
                </div>
            </section>

            <section className="mt-12 grid gap-6">
                <div>
                    <Typography as="span" variant="eyebrow" color="primary">
                        {t('pages.why.wider_eyebrow')}
                    </Typography>
                    <Typography
                        as="p"
                        size="sm"
                        color="muted"
                        className="mt-3 max-w-prose text-pretty">
                        {launchWide
                            ? t('pages.why.wider_lead_full')
                            : t('pages.why.wider_lead_core')}
                    </Typography>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                    {wider.map(item => (
                        <Link
                            key={item.product}
                            href={item.href}
                            className="group grid gap-2 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-accent/40 hover:bg-raised">
                            <span className="font-mono text-[10px] font-medium tracking-[0.14em] text-fg-faint uppercase">
                                {t(item.portalKey)}
                            </span>
                            <Typography as="h4" className="group-hover:text-accent">
                                {t(item.lineKey)}
                            </Typography>
                            <Typography as="p" size="sm" color="secondary" className="text-pretty">
                                {t(item.bodyKey)}
                            </Typography>
                        </Link>
                    ))}
                </div>
            </section>

            <section className="mt-12 grid gap-5 border-t border-line pt-10">
                <Typography as="h2" className="leading-snug md:text-3xl">
                    {t('pages.why.closing_title')}
                </Typography>
                <Typography as="p" size="sm" color="muted" className="max-w-prose text-pretty">
                    {t('pages.why.closing_body')}
                </Typography>
                <div className="flex flex-wrap gap-2">
                    <Link
                        href={productPath('money/jars')}
                        className="inline-flex h-9 cursor-pointer items-center justify-center rounded-full bg-accent px-4 text-xs font-semibold text-on-accent shadow-glow transition-all duration-200 hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-95">
                        {t('pages.why.cta_jars')}
                    </Link>
                    <Link
                        href={productPath('money/week-check')}
                        className="inline-flex h-9 cursor-pointer items-center justify-center rounded-full border border-line-strong bg-transparent px-4 text-xs font-semibold text-fg transition-all duration-200 hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-95">
                        {t('pages.why.cta_week_check')}
                    </Link>
                </div>
            </section>
        </PageContent>
    );
}
