'use client';

import { cn, jarCoverage } from '@rumtelo/utils';

import { bgClassToCssVar } from '@/app/_lib/jar-chrome';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';

import { JarProgressBar } from './jar-progress-bar';

type JarCoverageStripProps = {
    allocated: number;
    spent: number;
    committedOut: number;
    credited?: number;
    /** Tailwind bg-* jar color */
    colorClass: string;
    /** Show allocated / fixed / spent stats row */
    showStats?: boolean;
    footnote?: string;
};

/** Hero available figure + bar + optional three-stat strip for jar detail. */
export function JarCoverageStrip({
    allocated,
    spent,
    committedOut,
    credited = 0,
    colorClass,
    showStats = true,
    footnote = 'Available = allocated + added − spent − fixed. Booking the same bill as a transaction and a fixed cost will count twice until payments are linked.',
}: JarCoverageStripProps) {
    const { formatMoney } = useHouseholdCurrency();
    const coverage = jarCoverage({ allocated, spent, credited, committedOut });
    const accent = bgClassToCssVar(colorClass);
    const envelope = allocated + credited;

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
                        available of {formatMoney(envelope)}
                        {credited > 0
                            ? ` (${formatMoney(allocated)} + ${formatMoney(credited)} added)`
                            : ' allocated'}
                    </span>
                </div>

                <JarProgressBar
                    allocated={allocated}
                    spent={spent}
                    credited={credited}
                    committedOut={committedOut}
                    colorClass={colorClass}
                    trackClassName="h-2"
                />

                {showStats ? (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <CoverageStat label="Allocated" value={allocated} />
                        <CoverageStat label="Added" value={credited} />
                        <CoverageStat label="Fixed (committed)" value={committedOut} />
                        <CoverageStat label="Spent" value={spent} />
                    </div>
                ) : null}

                {footnote ? (
                    <p className="font-mono text-xs leading-relaxed text-fg-faint">{footnote}</p>
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
