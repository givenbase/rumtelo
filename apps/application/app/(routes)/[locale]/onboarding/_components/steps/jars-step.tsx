'use client';

import { useMemo, useState } from 'react';

import { JarExperience, JarKey } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';
import { Icon, Typography } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { webOrigin } from '@/app/_lib/auth';
import { planJarBankSetup } from '@/app/_lib/jar-bank-plan';

import { type DisplayJar } from '../onboarding-shared';

export function JarsStep({ displayJars }: { displayJars: DisplayJar[] }) {
    const t = useTranslations('pages.onboarding');
    const [expandedJar, setExpandedJar] = useState<JarKey | null>(null);
    const jarsLearnMoreHref = `${webOrigin()}/#jars`;
    const spaarpotjesHelpHref = `${webOrigin()}/support/spaarpotjes`;

    const jarBankPreview = useMemo(() => planJarBankSetup(JarExperience.NEW), []);

    function seatLabelForJar(jarKey: JarKey): { label: string; icon: 'landmark' | 'wallet' } {
        if (jarKey === JarKey.NECESSITIES) {
            return { label: t('banks_setup.preview.main_account'), icon: 'landmark' };
        }
        return { label: t('banks_setup.preview.sub_savings'), icon: 'wallet' };
    }

    return (
        <div className="mt-5 grid gap-5">
            <div className="grid gap-3">
                <Typography as="p" size="sm" weight="medium" color="muted">
                    {t('jars_tap_hint')}
                </Typography>
                <ul className="grid gap-2">
                    {displayJars.map(jar => {
                        const open = expandedJar === jar.key;
                        const seatLabel = seatLabelForJar(jar.key);
                        return (
                            <li
                                key={jar.key}
                                className={cn(
                                    'rounded-xl border transition-colors',
                                    open
                                        ? 'border-accent bg-accent-soft/30'
                                        : 'border-line bg-raised'
                                )}>
                                <button
                                    type="button"
                                    aria-expanded={open}
                                    aria-controls={`jar-note-${jar.key}`}
                                    id={`jar-toggle-${jar.key}`}
                                    onClick={() => setExpandedJar(open ? null : jar.key)}
                                    className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-card/60">
                                    <span className="relative grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-card text-lg">
                                        {jar.icon}
                                        <span className="absolute -top-1.5 -right-1.5 rounded-full border border-line bg-raised px-1.5 py-0.5 font-mono text-[9px] leading-none font-bold text-fg shadow-sm">
                                            {jar.pct}%
                                        </span>
                                    </span>
                                    <span className="grid min-w-0 flex-1 gap-0.5">
                                        <span className="flex flex-wrap items-center gap-2">
                                            <span className="truncate text-sm font-bold text-fg">
                                                {jar.name}
                                            </span>
                                            <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-accent/30 bg-accent-soft/50 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-accent">
                                                <Icon
                                                    name={seatLabel.icon}
                                                    size="sm"
                                                    color="inherit"
                                                />
                                                <span className="truncate">{seatLabel.label}</span>
                                            </span>
                                        </span>
                                        {jar.subtitle ? (
                                            <span className="truncate text-xs font-medium text-fg-muted">
                                                {jar.subtitle}
                                            </span>
                                        ) : null}
                                    </span>
                                    <Icon
                                        name="chevron-down"
                                        size="sm"
                                        color="muted"
                                        className={cn(
                                            'shrink-0 transition-transform',
                                            open && 'rotate-180'
                                        )}
                                    />
                                </button>
                                {open && jar.note ? (
                                    <div
                                        id={`jar-note-${jar.key}`}
                                        role="region"
                                        aria-labelledby={`jar-toggle-${jar.key}`}
                                        className="border-t border-line px-3 py-3">
                                        <Typography as="p" size="sm" weight="medium" color="muted">
                                            {jar.note}
                                        </Typography>
                                    </div>
                                ) : null}
                            </li>
                        );
                    })}
                </ul>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <a
                        href={jarsLearnMoreHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent underline-offset-2 hover:underline">
                        {t('jars_read_more')}
                        <span className="sr-only"> (opens in a new tab)</span>
                        <Icon name="chevron-right" size="sm" color="inherit" />
                    </a>
                    <a
                        href={spaarpotjesHelpHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-fg-muted underline-offset-2 hover:text-accent hover:underline">
                        {t('jars_spaarpotjes_help')}
                        <span className="sr-only"> (opens in a new tab)</span>
                        <Icon name="chevron-right" size="sm" color="inherit" />
                    </a>
                </div>
            </div>

            {jarBankPreview.tipKeys[0] ? (
                <p className="rounded-xl border border-accent/20 bg-accent-soft/40 px-3.5 py-2.5 text-sm font-medium text-accent">
                    {t(jarBankPreview.tipKeys[0])}
                </p>
            ) : null}
        </div>
    );
}
