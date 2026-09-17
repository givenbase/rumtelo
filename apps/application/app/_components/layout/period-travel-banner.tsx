'use client';

import { cn, describePeriodTravel } from '@rumtelo/utils';

import { useAppShell } from '@/components/features/shell/app-shell-context';

const MONTHS_SHORT = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
] as const;

/**
 * Persistent chrome when the selected budget month is not “now”.
 * Compact stamp only — full Looking Ahead / Looking Back narration lives in The Coach card.
 */
export function PeriodTravelBanner() {
    const { period, setPeriod } = useAppShell();
    const travel = describePeriodTravel(period);

    if (travel.direction === 'current') return null;

    const stamp = `${MONTHS_SHORT[period.month - 1]} ${period.year}`;
    const past = travel.direction === 'past';

    return (
        <div
            role="status"
            className={cn(
                'mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5',
                past ? 'border-amber-500/35 bg-amber-500/8' : 'border-accent/35 bg-accent-soft'
            )}>
            <div className="min-w-0">
                <p
                    className={cn(
                        'font-mono text-[10px] font-semibold tracking-[0.14em] uppercase',
                        past ? 'text-amber-800 dark:text-amber-300' : 'text-accent'
                    )}>
                    {past ? 'Looking back' : 'Looking ahead'}
                </p>
                <p className="mt-0.5 text-sm text-fg">
                    Viewing <span className="font-medium">{stamp}</span>
                    <span className="text-fg-muted">
                        {' '}
                        · {travel.relativeLabel}
                        {travel.daysLabel ? ` · ${travel.daysLabel}` : ''}
                    </span>
                </p>
            </div>
            <button
                type="button"
                onClick={() => {
                    const now = new Date();
                    setPeriod({ year: now.getFullYear(), month: now.getMonth() + 1 });
                }}
                className={cn(
                    'shrink-0 rounded-full border px-3 py-1.5 font-mono text-[10px] font-medium tracking-wide uppercase transition-colors',
                    past
                        ? 'border-amber-600/40 text-amber-900 hover:bg-amber-500/15 dark:text-amber-200'
                        : 'border-accent/50 text-accent hover:bg-accent-soft'
                )}>
                This month
            </button>
        </div>
    );
}
