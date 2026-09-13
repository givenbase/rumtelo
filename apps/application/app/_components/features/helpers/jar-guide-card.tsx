'use client';

import Link from 'next/link';

import { cn } from '@rumtelo/utils';

import { JAR_GUIDE, type JarGuideKey } from '@/app/_lib/jar-guide';
import { JAR_META } from '@/app/_lib/jar-meta';
import { productPath } from '@/app/_lib/routes';
import { settingsHref } from '@/app/_lib/settings-tabs';

import { CoachMark } from './helper-mark';
import { useHelpersEnabled } from './provider';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';

type JarGuideCardProps = {
    jarKey: JarGuideKey;
    allocatedCents?: number;
    className?: string;
};

/**
 * Coach guide for a jar — what it is for, with icons and next moves.
 * Hidden when Coach guides are off (Help or Settings → Account).
 */
export function JarGuideCard({ jarKey, allocatedCents = 0, className }: JarGuideCardProps) {
    const { formatMoney } = useHouseholdCurrency();
    const coachGuidesEnabled = useHelpersEnabled();
    const guide = JAR_GUIDE[jarKey];
    const meta = JAR_META.find(entry => entry.key === jarKey);

    if (!coachGuidesEnabled || !guide) return null;

    return (
        <section
            className={cn('grid gap-2.5', className)}
            data-feature-helper="jar-guide"
            data-coach-guide="jar"
            aria-label="The Coach for this jar">
            <div className="flex flex-wrap items-center gap-2">
                <span
                    className="grid size-7 place-items-center rounded-lg bg-accent/12 text-sm"
                    aria-hidden>
                    {meta?.icon ?? '✦'}
                </span>
                <h2 className="font-mono text-[10px] font-bold tracking-[0.14em] text-accent uppercase">
                    What can I use this for?
                </h2>
                <CoachMark size="sm" />
            </div>

            <div className="overflow-hidden rounded-2xl border border-accent/20 bg-surface shadow-sm ring-1 ring-accent/10">
                <div className="border-b border-line bg-gradient-to-br from-accent/8 via-raised to-surface px-4 py-3.5">
                    <p className="text-sm leading-relaxed text-pretty text-fg">{guide.note}</p>
                </div>

                <div className="grid gap-4 px-4 py-4">
                    <div>
                        <p className="mb-2 font-mono text-[10px] font-semibold tracking-[0.12em] text-fg-faint uppercase">
                            This may go to
                        </p>
                        <ul className="flex flex-wrap gap-1.5">
                            {guide.allowed.map(item => (
                                <li
                                    key={item.label}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-line bg-raised/80 px-2.5 py-1.5 text-xs font-medium text-fg-secondary">
                                    <span className="text-sm leading-none" aria-hidden>
                                        {item.icon}
                                    </span>
                                    {item.label}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {guide.subs && guide.subs.length > 0 ? (
                        <div className="rounded-xl border border-dashed border-line bg-raised/40 px-3 py-3">
                            <p className="mb-2.5 font-mono text-[10px] font-semibold tracking-[0.12em] text-fg-faint uppercase">
                                Split inside this jar
                            </p>
                            <div className="grid gap-2.5">
                                {guide.subs.map(sub => (
                                    <div key={sub.label}>
                                        <div className="mb-1 flex items-center justify-between gap-2 font-mono text-[11px] font-medium">
                                            <span className="inline-flex items-center gap-1.5 text-fg-secondary">
                                                {sub.icon ? (
                                                    <span aria-hidden>{sub.icon}</span>
                                                ) : null}
                                                {sub.label}
                                            </span>
                                            <span className="text-accent tabular-nums">
                                                {formatMoney(
                                                    Math.round((allocatedCents * sub.pct) / 100)
                                                )}{' '}
                                                · {sub.pct}%
                                            </span>
                                        </div>
                                        <div className="h-1.5 overflow-hidden rounded-full bg-sunken">
                                            <div
                                                className="h-full rounded-full bg-accent"
                                                style={{ width: `${sub.pct}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {guide.subNote ? (
                                <p className="mt-2.5 text-xs leading-relaxed text-pretty text-accent">
                                    {guide.subNote}
                                </p>
                            ) : null}
                        </div>
                    ) : null}

                    <div className="flex gap-2.5 rounded-xl border border-danger/25 bg-danger/5 px-3 py-2.5">
                        <span className="shrink-0 text-base leading-none" aria-hidden>
                            🚫
                        </span>
                        <p className="text-xs leading-relaxed text-pretty text-fg-secondary">
                            {guide.notAllowed}
                        </p>
                    </div>

                    {guide.links.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                            {guide.links.map(link => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-line bg-raised px-3 py-2 text-xs font-semibold text-fg transition-colors hover:border-accent hover:bg-accent/10 hover:text-accent">
                                    <span aria-hidden>{link.icon}</span>
                                    {link.label}
                                    <span className="text-fg-faint" aria-hidden>
                                        →
                                    </span>
                                </Link>
                            ))}
                        </div>
                    ) : null}

                    <p className="text-[11px] leading-relaxed text-fg-faint">
                        The Coach — tips without shame.{' '}
                        <Link
                            href={productPath('coach')}
                            className="font-medium text-accent underline-offset-2 hover:underline">
                            Open The Coach
                        </Link>
                        {' · '}
                        <Link
                            href={settingsHref('account')}
                            className="font-medium text-accent underline-offset-2 hover:underline">
                            Turn tips off
                        </Link>
                        .
                    </p>
                </div>
            </div>
        </section>
    );
}
