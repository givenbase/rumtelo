'use client';

import {
    JAR_GROUP_ORDER,
    sumPercentageByGroup,
    type OnboardingSplitPreview,
} from '@rumtelo/contracts';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import { Typography } from '@rumtelo/ui';
import { cn, formatMoney } from '@rumtelo/utils';

import { resolveJarName } from '@/app/_lib/jar-copy';
import { GROUP_CHROME, jarsInGroup, orderJarsByGroup, sumGroupAmount } from '@/app/_lib/jar-group';
import { jarChrome, jarIcon } from '@/app/_lib/jar-meta';
import { useJarCatalog } from '@/app/_lib/use-jar-catalog';

/** Percent with at most two decimals, no trailing zeros ("55", "12.5"). */
function percentLabel(value: number, locale: string): string {
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)}%`;
}

/**
 * Screen 2 body: the server's split in the chosen currency, shown as three groups
 * (Basics, Future, Free) with the six pots inside. Every pot number comes from
 * `previewSplit` (integer minor units); the only sums here are the per-group subtotals
 * shown next to each header.
 */
export function SplitStep({ preview }: { preview: OnboardingSplitPreview }) {
    const t = useTranslations('pages.onboarding');
    const tGroups = useTranslations('features.money.groups');
    const tJars = useTranslations('features.money.jars');
    const locale = useLocale();
    const { byKey: catalogByKey } = useJarCatalog();
    const money = (minor: number) => formatMoney(minor, { currency: preview.currency, locale });
    const groupShares = sumPercentageByGroup(preview.jars);

    return (
        <div className="mt-5 grid gap-5">
            {/* Decoration only: the list below carries the meaning. */}
            <div aria-hidden="true" className="flex h-2 gap-0.5 overflow-hidden rounded-full">
                {orderJarsByGroup(preview.jars).map(jar => (
                    <span
                        key={jar.key}
                        className={cn('h-full min-w-0.5 rounded-full', jarChrome(jar.key).color)}
                        // Data-driven width: the server percentage.
                        style={{ width: `${jar.percentage}%` }}
                    />
                ))}
            </div>

            <div aria-label={t('split_list_aria')} role="group" className="grid gap-5">
                {JAR_GROUP_ORDER.map((group, groupIndex) => {
                    const headingId = `split-group-${group}`;
                    return (
                        <section key={group} aria-labelledby={headingId} className="grid gap-2">
                            <header className="flex min-w-0 items-start justify-between gap-3">
                                <div className="flex min-w-0 items-start gap-2.5">
                                    <span
                                        aria-hidden="true"
                                        className={cn(
                                            'grid size-6 shrink-0 place-items-center rounded-full border border-line bg-raised font-mono text-xs font-semibold',
                                            GROUP_CHROME[group].text
                                        )}>
                                        {groupIndex + 1}
                                    </span>
                                    <div className="min-w-0">
                                        <h3
                                            id={headingId}
                                            className="text-sm leading-tight font-semibold text-fg">
                                            {tGroups(`${group}.title`)}
                                        </h3>
                                        <p className="text-xs leading-snug text-fg-muted">
                                            {tGroups(`${group}.line`)}
                                        </p>
                                    </div>
                                </div>
                                <div className="grid shrink-0 justify-items-end gap-0.5 text-right font-mono text-xs">
                                    <span className="text-sm whitespace-nowrap text-fg tabular-nums">
                                        {money(
                                            sumGroupAmount(preview.jars, group, jar => jar.amount)
                                        )}
                                    </span>
                                    <span className="whitespace-nowrap text-fg-muted">
                                        {percentLabel(groupShares[group], locale)}
                                    </span>
                                </div>
                            </header>
                            <ul className="grid gap-2">
                                {jarsInGroup(preview.jars, group).map(jar => {
                                    const catalog = catalogByKey.get(jar.key);
                                    // Template name while the catalog is loaded (still localised when it
                                    // is a seed default); the app's pot name until then.
                                    const name = catalog?.name
                                        ? resolveJarName(tJars, jar.key, catalog.name)
                                        : tJars(`names.${jar.key}`);
                                    const jobId = `split-job-${jar.key}`;
                                    return (
                                        <li
                                            key={jar.key}
                                            aria-label={t('split_row_aria', {
                                                jar: name,
                                                percent: percentLabel(
                                                    jar.percentage,
                                                    locale
                                                ).replace('%', ''),
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
                                                    <span
                                                        title={name}
                                                        className="block font-semibold text-pretty text-fg">
                                                        {name}
                                                    </span>
                                                    <span className="block font-mono text-xs text-fg-muted">
                                                        {percentLabel(jar.percentage, locale)}
                                                    </span>
                                                </span>
                                                <span className="shrink-0 font-mono text-sm whitespace-nowrap text-fg tabular-nums">
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
                        </section>
                    );
                })}
            </div>

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
