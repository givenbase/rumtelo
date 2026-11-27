'use client';

import { jarGroupFor, sumPercentageByGroup, type OnboardingSplitPreview } from '@rumtelo/contracts';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import { Typography } from '@rumtelo/ui';
import { cn, formatMoney } from '@rumtelo/utils';

import { resolvePotName } from '@/app/_lib/jar-copy';
import {
    GROUP_CHROME,
    groupBlocks,
    groupViews,
    orderJarsByGroup,
    sumGroupAmount,
} from '@/app/_lib/jar-group';
import { jarChrome, jarIcon } from '@/app/_lib/jar-meta';
import { useJarCatalog } from '@/app/_lib/use-jar-catalog';

/** Percent with at most two decimals, no trailing zeros ("55", "12.5"). */
function percentLabel(value: number, locale: string): string {
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)}%`;
}

/**
 * Screen 2 body: the server's split in the chosen currency. A new household starts with three
 * pots, one per group, so each is named after its group (Basics, Future, Free) with the group's
 * number and no heading above it; optional pots come later in Settings. Every pot number comes
 * from `previewSplit` (integer minor units); the only sums are per-group subtotals, shown next
 * to a heading only if a group ever holds more than one pot.
 */
export function SplitStep({ preview }: { preview: OnboardingSplitPreview }) {
    const t = useTranslations('pages.onboarding');
    const tGroups = useTranslations('features.money.groups');
    const tJars = useTranslations('features.money.jars');
    const locale = useLocale();
    const { byKey: catalogByKey } = useJarCatalog();
    const money = (minor: number) => formatMoney(minor, { currency: preview.currency, locale });
    const groupShares = sumPercentageByGroup(preview.jars);
    const presentKeys = preview.jars.map(jar => jar.key);
    const blocks = groupBlocks(groupViews(preview.jars));

    /** `groupPosition` is set on a pot that stands for its whole group: it carries the group's number. */
    function renderRow(jar: OnboardingSplitPreview['jars'][number], groupPosition: number | null) {
        const catalog = catalogByKey.get(jar.key);
        // Template name while the catalog is loaded (a seed default reads as the group name for
        // a lone main pot); the app's per-pot name until then.
        const name = catalog?.name
            ? resolvePotName({ jars: tJars, groups: tGroups }, jar.key, catalog.name, presentKeys)
            : resolvePotName(
                  { jars: tJars, groups: tGroups },
                  jar.key,
                  tJars(`names.${jar.key}`),
                  presentKeys
              );
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
                {/* Wraps: on a narrow phone the amount drops under the name instead of squeezing it. */}
                <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                    {groupPosition ? (
                        <span
                            aria-hidden="true"
                            className={cn(
                                'grid size-6 shrink-0 place-items-center rounded-full border border-line bg-surface font-mono text-xs font-semibold',
                                GROUP_CHROME[jarGroupFor(jar.key)].text
                            )}>
                            {groupPosition}
                        </span>
                    ) : null}
                    <span
                        aria-hidden="true"
                        className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface text-lg">
                        {jarIcon(jar.key, catalog?.icon)}
                    </span>
                    <span className="min-w-36 flex-1">
                        <span
                            title={name}
                            className="block font-semibold text-pretty break-words text-fg">
                            {name}
                        </span>
                        <span className="block font-mono text-xs text-fg-muted">
                            {percentLabel(jar.percentage, locale)}
                        </span>
                    </span>
                    <span className="ml-auto shrink-0 font-mono text-sm whitespace-nowrap text-fg tabular-nums">
                        {money(jar.amount)}
                    </span>
                </div>
                <p id={jobId} className="text-sm text-fg-muted">
                    {t(`split_jobs.${jar.key}`)}
                </p>
            </li>
        );
    }

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
                {blocks.map(block => {
                    if (block.kind === 'tiles') {
                        return (
                            <ul
                                key={block.views.map(view => view.group).join('-')}
                                className="grid gap-2">
                                {block.views.map(view => renderRow(view.jars[0]!, view.position))}
                            </ul>
                        );
                    }
                    const { group, position, jars: groupJars } = block.view;
                    const headingId = `split-group-${group}`;
                    return (
                        <section key={group} aria-labelledby={headingId} className="grid gap-2">
                            <header className="flex min-w-0 flex-wrap items-start justify-between gap-x-3 gap-y-1">
                                <div className="flex min-w-36 flex-1 items-start gap-2.5">
                                    <span
                                        aria-hidden="true"
                                        className={cn(
                                            'grid size-6 shrink-0 place-items-center rounded-full border border-line bg-raised font-mono text-xs font-semibold',
                                            GROUP_CHROME[group].text
                                        )}>
                                        {position}
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
                                <div className="ml-auto grid shrink-0 justify-items-end gap-0.5 text-right font-mono text-xs">
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
                                {groupJars.map(jar => renderRow(jar, null))}
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
                <p>{t('split_refine_later')}</p>
                <p>{t('split_change_later')}</p>
            </div>
        </div>
    );
}
