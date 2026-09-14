'use client';

import type { JarBalance } from '@rumtelo/contracts';
import { cn, jarCoverage, usedPctDisplay } from '@rumtelo/utils';

type JarProgressBarProps = Pick<JarBalance, 'allocated' | 'spent' | 'committedOut'> & {
    credited?: JarBalance['credited'];
    /** Tailwind bg-* class when not overspent */
    colorClass: string;
    className?: string;
    trackClassName?: string;
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
}: JarProgressBarProps) {
    const coverage = jarCoverage({ allocated, spent, credited, committedOut });
    const pct = usedPctDisplay(coverage);

    return (
        <span
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
}
