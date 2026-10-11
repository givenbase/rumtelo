'use client';

import type { JarBalance } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';
import { jarCoverage } from '@rumtelo/utils';

import { bgClassToCssVar } from '@/app/_lib/jar-chrome';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';

import { MetricStrip, type MetricStripItem } from './metric-strip';

type JarCoverageStripProps = Pick<
    JarBalance,
    'allocated' | 'spent' | 'committedOut' | 'potBalance'
> & {
    credited?: JarBalance['credited'];
    /** Tailwind bg-* jar color */
    colorClass: string;
    /** Show allocated / fixed / spent stats row */
    showStats?: boolean;
    footnote?: string;
    /** Hide the committed-bills stat (Financial Freedom / Long-term savings). */
    showCommitted?: boolean;
};

/** Hero available + pot + equation strip for jar detail (no spare bar band). */
export function JarCoverageStrip({
    allocated,
    spent,
    committedOut,
    potBalance,
    credited = 0,
    colorClass,
    showStats = true,
    showCommitted = true,
    footnote,
}: JarCoverageStripProps) {
    const t = useTranslations('features.money.jar_coverage');
    const tJars = useTranslations('features.money.jars');
    const { formatMoney } = useHouseholdCurrency();
    const committed = showCommitted ? committedOut : 0;
    const coverage = jarCoverage({ allocated, spent, credited, committedOut: committed });
    const accent = bgClassToCssVar(colorClass);
    const envelope = allocated + credited;
    const resolvedFootnote =
        footnote !== undefined
            ? footnote
            : showCommitted
              ? t('footnote_bills')
              : t('footnote_simple');

    // Movement only — allocated already lives in the hero hint (“left of €X”).
    const equationItems: MetricStripItem[] = [
        ...(credited > 0 ? [{ label: t('added'), value: formatMoney(credited) }] : []),
        ...(showCommitted && committedOut > 0
            ? [{ label: t('fixed_committed'), value: formatMoney(committedOut) }]
            : []),
        ...(spent > 0 ? [{ label: t('spent'), value: formatMoney(spent) }] : []),
    ];
    const soleEquation = equationItems.length === 1 ? equationItems[0] : undefined;

    return (
        <div
            className="overflow-hidden rounded-2xl border border-t-[3px] border-line bg-card"
            style={{ borderTopColor: accent }}>
            <div className="grid gap-0">
                <MetricStrip
                    size="lg"
                    className="border-t-0"
                    items={[
                        {
                            label: tJars('this_month'),
                            value: formatMoney(coverage.available),
                            tone: coverage.overspent ? 'danger' : 'default',
                            hint: (
                                <>
                                    {t('available_of', { amount: formatMoney(envelope) })}
                                    {credited > 0
                                        ? t('added_breakdown', {
                                              allocated: formatMoney(allocated),
                                              added: formatMoney(credited),
                                          })
                                        : t('allocated_only')}
                                </>
                            ),
                        },
                        {
                            label: t('in_pot_label'),
                            value: formatMoney(potBalance),
                            tone: 'success',
                            hint: t('in_pot_hint'),
                        },
                    ]}
                />

                {showStats && soleEquation ? (
                    <p className="border-t border-line px-4 py-3 font-mono text-xs text-fg-muted sm:px-5">
                        <span className="tracking-wide text-fg-faint uppercase">
                            {soleEquation.label}
                        </span>
                        <span className="mx-1.5 text-fg-faint">·</span>
                        <span className="font-semibold text-fg tabular-nums">
                            {soleEquation.value}
                        </span>
                    </p>
                ) : null}
                {showStats && equationItems.length > 1 ? (
                    <MetricStrip items={equationItems} />
                ) : null}

                {resolvedFootnote ? (
                    <p className="border-t border-line px-4 py-3 font-mono text-xs leading-relaxed text-fg-faint sm:px-5">
                        {resolvedFootnote}
                    </p>
                ) : null}
            </div>
        </div>
    );
}
