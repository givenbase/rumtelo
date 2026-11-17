'use client';

import type { OnboardingSplitPreview } from '@rumtelo/contracts';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import { Typography } from '@rumtelo/ui';
import { cn, formatMoney } from '@rumtelo/utils';

import { jarChrome, jarIcon } from '@/app/_lib/jar-meta';
import { useJarCatalog } from '@/app/_lib/use-jar-catalog';

import { JAR_NAME_KEYS } from '../onboarding-shared';

/** Percent with at most two decimals, no trailing zeros ("55", "12.5"). */
function percentLabel(value: number, locale: string): string {
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)}%`;
}

/**
 * Screen 2 body: the server's split in the chosen currency. Every number comes from
 * `previewSplit` (integer minor units); nothing is computed here.
 */
export function SplitStep({ preview }: { preview: OnboardingSplitPreview }) {
    const t = useTranslations('pages.onboarding');
    const tRoot = useTranslations();
    const locale = useLocale();
    const { byKey: catalogByKey } = useJarCatalog();
    const money = (minor: number) => formatMoney(minor, { currency: preview.currency, locale });

    return (
        <div className="mt-5 grid gap-5">
            {/* Decoration only: the list below carries the meaning. */}
            <div aria-hidden="true" className="flex h-2 gap-0.5 overflow-hidden rounded-full">
                {preview.jars.map(jar => (
                    <span
                        key={jar.key}
                        className={cn('h-full min-w-0.5 rounded-full', jarChrome(jar.key).color)}
                        // Data-driven width: the server percentage.
                        style={{ width: `${jar.percentage}%` }}
                    />
                ))}
            </div>

            <ul aria-label={t('split_list_aria')} className="grid gap-2">
                {preview.jars.map(jar => {
                    const catalog = catalogByKey.get(jar.key);
                    const name = catalog?.name ?? tRoot(JAR_NAME_KEYS[jar.key]);
                    const jobId = `split-job-${jar.key}`;
                    return (
                        <li
                            key={jar.key}
                            aria-label={t('split_row_aria', {
                                jar: name,
                                percent: percentLabel(jar.percentage, locale).replace('%', ''),
                                amount: money(jar.amount),
                            })}
                            aria-describedby={jobId}
                            className="grid gap-1 rounded-xl border border-line bg-raised px-3.5 py-3">
                            <div className="flex min-w-0 items-center gap-3">
                                <span
                                    aria-hidden="true"
                                    className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface text-lg">
                                    {jarIcon(jar.key, catalog?.icon)}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block font-semibold text-pretty text-fg sm:truncate">
                                        {name}
                                    </span>
                                    <span className="block font-mono text-xs text-fg-muted">
                                        {percentLabel(jar.percentage, locale)}
                                    </span>
                                </span>
                                <span className="shrink-0 font-mono text-sm text-fg tabular-nums">
                                    {money(jar.amount)}
                                </span>
                            </div>
                            <p id={jobId} className="text-sm text-fg-muted">
                                {t(`split_jobs.${jar.key}`)}
                            </p>
                        </li>
                    );
                })}
            </ul>

            {preview.monthlyNetIncome === 0 ? (
                <Typography as="p" size="sm" color="muted">
                    {t('split_zero')}
                </Typography>
            ) : null}

            <div className="grid gap-1.5 rounded-xl border border-line px-3.5 py-3 text-sm text-fg-muted">
                <p>{t('split_main_account')}</p>
                <p>{t('split_note')}</p>
                <p>{t('split_change_later')}</p>
            </div>
        </div>
    );
}
