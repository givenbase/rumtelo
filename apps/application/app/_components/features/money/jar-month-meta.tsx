'use client';

import { useTranslations } from '@rumtelo/i18n';
import { cn } from '@rumtelo/utils';

import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';

import { JarPotBadge } from './jar-month-pot-amounts';

export type JarMonthMetaFacts = {
    potBalance: number;
    /** Fixed costs still due this period — only signal besides pot on list/home. */
    openCount?: number;
};

type Translate = (key: string, values?: Record<string, string | number>) => string;

/** Spoken summary for link/button accessible names. */
export function jarMonthMetaAria(
    facts: JarMonthMetaFacts,
    t: Translate,
    formatMoney: (cents: number) => string
): string {
    const parts: string[] = [t('in_pot_amount', { amount: formatMoney(facts.potBalance) })];
    const open = facts.openCount ?? 0;
    if (open > 0) parts.push(t('meta_open', { count: open }));
    return parts.join(', ');
}

/**
 * List/home footer: pot + optional “open bills” signal only.
 * Amount breakdowns stay on jar detail.
 */
export function JarMonthMeta({ facts }: { facts: JarMonthMetaFacts }) {
    const t = useTranslations('features.money.jars');
    const { formatMoney } = useHouseholdCurrency();
    const open = facts.openCount ?? 0;
    const groupLabel = jarMonthMetaAria(facts, t, formatMoney);

    return (
        <div
            role="group"
            aria-label={groupLabel}
            className="flex min-w-0 flex-wrap items-center gap-1 sm:gap-1.5">
            <JarPotBadge amount={facts.potBalance} className="shrink-0" />
            {open > 0 ? (
                <span
                    aria-label={`${t('meta_open', { count: open })}. ${t('meta_open_hint')}`}
                    className={cn(
                        'inline-flex max-w-full min-w-0 items-center gap-1 rounded-full border border-warning/50 bg-warning/15 px-1.5 py-0.5 font-mono text-[11px] font-medium tracking-wide text-warning sm:px-2 sm:text-xs'
                    )}>
                    <span aria-hidden className="uppercase">
                        {t('meta_open', { count: open })}
                    </span>
                </span>
            ) : null}
        </div>
    );
}
