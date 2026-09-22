'use client';

import type { JarBalance } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';
import { cn, jarCoverage } from '@rumtelo/utils';

import { bgClassToCssVar } from '@/app/_lib/jar-chrome';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';

import { JarProgressBar } from './jar-progress-bar';

type JarCoverageStripProps = Pick<JarBalance, 'allocated' | 'spent' | 'committedOut'> & {
    credited?: JarBalance['credited'];
    /** Tailwind bg-* jar color */
    colorClass: string;
    /** Show allocated / fixed / spent stats row */
    showStats?: boolean;
    footnote?: string;
    /** Hide the committed-bills stat (Financial Freedom / Long-term savings). */
    showCommitted?: boolean;
};

/** Hero available figure + bar + optional three-stat strip for jar detail. */
export function JarCoverageStrip({
    allocated,
    spent,
    committedOut,
    credited = 0,
    colorClass,
    showStats = true,
    showCommitted = true,
    footnote,
}: JarCoverageStripProps) {
    const t = useTranslations('features.money.jar_coverage');
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

    return (
        <div
            className="rounded-2xl border border-t-[3px] border-line bg-card"
            style={{ borderTopColor: accent }}>
            <div className="grid gap-4 p-5">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span
                        className={cn(
                            'font-display text-3xl font-semibold tracking-tight',
                            coverage.overspent ? 'text-danger' : 'text-fg'
                        )}>
                        {formatMoney(coverage.available)}
                    </span>
                    <span className="font-mono text-xs font-medium text-fg-faint">
                        {t('available_of', { amount: formatMoney(envelope) })}
                        {credited > 0
                            ? t('added_breakdown', {
                                  allocated: formatMoney(allocated),
                                  added: formatMoney(credited),
                              })
                            : t('allocated_only')}
                    </span>
                </div>

                <JarProgressBar
                    allocated={allocated}
                    spent={spent}
                    credited={credited}
                    committedOut={committed}
                    colorClass={colorClass}
                    trackClassName="h-2"
                />

                {showStats ? (
                    <div
                        className={cn(
                            'grid gap-3 sm:grid-cols-2',
                            showCommitted ? 'lg:grid-cols-4' : 'lg:grid-cols-3'
                        )}>
                        <CoverageStat label={t('allocated')} value={allocated} />
                        <CoverageStat label={t('added')} value={credited} />
                        {showCommitted ? (
                            <CoverageStat label={t('fixed_committed')} value={committedOut} />
                        ) : null}
                        <CoverageStat label={t('spent')} value={spent} />
                    </div>
                ) : null}

                {resolvedFootnote ? (
                    <p className="font-mono text-xs leading-relaxed text-fg-faint">
                        {resolvedFootnote}
                    </p>
                ) : null}
            </div>
        </div>
    );
}

function CoverageStat({ label, value }: { label: string; value: number }) {
    const { formatMoney } = useHouseholdCurrency();
    return (
        <div className="rounded-lg border border-line bg-raised px-3 py-2.5">
            <p className="font-mono text-xs tracking-wide text-fg-faint uppercase">{label}</p>
            <p className="mt-1 font-mono text-sm text-fg tabular-nums">{formatMoney(value)}</p>
        </div>
    );
}
