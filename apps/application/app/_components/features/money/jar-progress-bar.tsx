'use client';

import type { JarBalance } from '@rumtelo/contracts';
import { cn, jarCoverage, usedPctDisplay } from '@rumtelo/utils';

type JarProgressBarProps = Pick<JarBalance, 'allocated' | 'spent' | 'committedOut'> & {
    credited?: JarBalance['credited'];
    /** Tailwind bg-* class when not overspent */
    colorClass: string;
    className?: string;
    trackClassName?: string;
    /**
     * Optional outer band (e.g. coverage-strip padding). Only rendered when the
     * bar itself is shown — avoids an empty padded gap at 0% used.
     */
    bandClassName?: string;
    /** Skip the track when nothing is used (default). */
    hideWhenEmpty?: boolean;
};

/** Shared used-progress bar — maths from jarCoverage / usedPctDisplay. */
export function JarProgressBar({
    allocated,
    spent,
    committedOut,
    credited = 0,
    colorClass,
    className,
    trackClassName,
    bandClassName,
    hideWhenEmpty = true,
}: JarProgressBarProps) {
    const coverage = jarCoverage({ allocated, spent, credited, committedOut });
    const pct = usedPctDisplay(coverage);
    const empty = pct === 0 && !coverage.overspent;

    if (hideWhenEmpty && empty) return null;

    // Decorative — amounts next to the bar carry the accessible meaning.
    const track = (
        <span
            aria-hidden
            className={cn(
                'h-1.5 overflow-hidden rounded-full bg-sunken',
                trackClassName,
                className
            )}>
            <span
                className={cn(
                    'block h-full rounded-full transition-all duration-500 ease-out',
                    coverage.overspent ? 'bg-danger' : colorClass
                )}
                style={{ width: `${pct}%` }}
            />
        </span>
    );

    if (bandClassName) {
        return <div className={bandClassName}>{track}</div>;
    }

    return track;
}
