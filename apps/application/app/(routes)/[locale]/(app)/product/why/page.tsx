import Link from 'next/link';

import { BRAND_TAGLINE } from '@rumtelo/i18n';
import { Card, Section, Typography } from '@rumtelo/ui';

import { isProductEnabled } from '@/app/_lib/launch-products';
import { productPath } from '@/app/_lib/routes';
import { PageContent } from '@/components/layout/page-content';

export const metadata = { title: 'Why' };

/** What the slogan means — decode, then widen. Source: docs/brand/quotes.md */
const MEANING = [
    {
        line: 'Money leaves. You’ll know why.',
        body: 'Not a spreadsheet after the fact. When an amount leaves, you see the jar it came from — so “where did it go?” has an answer.',
    },
    {
        line: 'Assign it before you wonder where it went.',
        body: 'Income lands and gets a job across six jars the same second. Split first. Spend second. Money with a job does not need defending all month.',
    },
    {
        line: 'Know where it went. Know where it’s going.',
        body: 'Looking back without a direction is only half the picture. Goals, debt payoff, and Financial Freedom point the next paycheck forward.',
    },
] as const;

const WIDER = [
    {
        portal: 'Money',
        product: 'money',
        line: 'Money gets a job.',
        body: 'Six jars. One calm overview. Fixed costs, inbox, and the week check keep the picture current.',
        href: productPath('money/jars'),
    },
    {
        portal: 'Growth',
        product: 'growth',
        line: 'Ambition with a plan — not a guess.',
        body: 'Income, goals, and net worth so “earn more” has a map, not a vibe.',
        href: productPath('growth/income'),
    },
    {
        portal: 'Energy',
        product: 'energy',
        line: 'A tired head spends. A rested head decides.',
        body: 'Sleep, training, food — the floor under every money choice. Life leaks too, not only the balance.',
        href: productPath('energy/week'),
    },
    {
        portal: 'Soul',
        product: 'soul',
        line: 'Know the why — not only the spend.',
        body: 'Intention and stillness so the plan survives a hard week. Direction, not only discipline.',
        href: productPath('soul/intent'),
    },
] as const;

/**
 * In-app manifesto — slogan first, then what we mean.
 * Brand: docs/brand/quotes.md · positioning.md
 */
export default function WhyFoundationPage() {
    const wider = WIDER.filter(item => isProductEnabled(item.product));
    const launchWide = isProductEnabled('energy') || isProductEnabled('soul');

    return (
        <PageContent width="prose" className="animate-rise">
            <Section eyebrow="✦ Why Rumtelo">
                <Typography as="p" variant="eyebrow" color="primary">
                    The line we stand on
                </Typography>
                <Typography
                    as="h1"
                    size="lg"
                    className="mt-3 text-4xl leading-[1.1] md:text-5xl lg:text-6xl">
                    {BRAND_TAGLINE}
                </Typography>
                <Typography as="p" variant="lead" size="lg" className="mt-5">
                    That is not a clever phrase. It is the problem we refuse to leave unsolved —
                    mystery spending, foggy paychecks, and the quiet stress of not knowing. We end
                    the mystery. Then we widen the picture.
                </Typography>
            </Section>

            <section className="mt-12 grid gap-6">
                <Typography as="span" variant="eyebrow" color="primary">
                    ✦ What we mean
                </Typography>
                <div className="grid gap-4">
                    {MEANING.map(item => (
                        <Card key={item.line} className="grid gap-2 p-5">
                            <Typography as="h3" size="lg">
                                {item.line}
                            </Typography>
                            <Typography as="p" size="sm" color="secondary" className="text-pretty">
                                {item.body}
                            </Typography>
                        </Card>
                    ))}
                </div>
            </section>

            <section className="mt-12 grid gap-6">
                <div>
                    <Typography as="span" variant="eyebrow" color="primary">
                        ✦ Bigger than the balance
                    </Typography>
                    <Typography
                        as="p"
                        size="sm"
                        color="muted"
                        className="mt-3 max-w-prose text-pretty">
                        {launchWide
                            ? 'Money is the door. Energy, growth, and soul complete the overview — so you stop wondering where it went, what you’re running on, and why it matters.'
                            : 'Money is the door. Growth completes the overview — so you stop wondering where it went and where the next paycheck is going.'}
                    </Typography>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                    {wider.map(item => (
                        <Link
                            key={item.portal}
                            href={item.href}
                            className="group grid gap-2 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-accent/40 hover:bg-raised">
                            <span className="font-mono text-[10px] font-medium tracking-[0.14em] text-fg-faint uppercase">
                                {item.portal}
                            </span>
                            <Typography as="h4" className="group-hover:text-accent">
                                {item.line}
                            </Typography>
                            <Typography as="p" size="sm" color="secondary" className="text-pretty">
                                {item.body}
                            </Typography>
                        </Link>
                    ))}
                </div>
            </section>

            <section className="mt-12 grid gap-5 border-t border-line pt-10">
                <Typography as="h2" className="leading-snug md:text-3xl">
                    Don’t chase the number. Own the direction.
                </Typography>
                <Typography as="p" size="sm" color="muted" className="max-w-prose text-pretty">
                    Built for people who are doing well — and for people who are ready to. Six jars.
                    One calm overview. Information, never shame: a jar over its line is a signal
                    with a next move, not a verdict on who you are.
                </Typography>
                <div className="flex flex-wrap gap-2">
                    <Link
                        href={productPath('money/jars')}
                        className="inline-flex h-9 cursor-pointer items-center justify-center rounded-full bg-accent px-4 text-xs font-semibold text-on-accent shadow-glow transition-all duration-200 hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-95">
                        Open the jars
                    </Link>
                    <Link
                        href={productPath('money/week-check')}
                        className="inline-flex h-9 cursor-pointer items-center justify-center rounded-full border border-line-strong bg-transparent px-4 text-xs font-semibold text-fg transition-all duration-200 hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-95">
                        Weekly check
                    </Link>
                </div>
            </section>
        </PageContent>
    );
}
