'use client';

import { useLocale, useTranslations } from '@rumtelo/i18n';
import { cn, describePeriodTravel } from '@rumtelo/utils';

import { formatPeriodTravelLabels } from '@/app/_lib/period-travel-i18n';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';

function formatPeriodStamp(year: number, month: number, locale: string): string {
    return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(
        new Date(year, month - 1, 1)
    );
}

/**
 * Persistent chrome when the selected budget month is not “now”.
 * Compact stamp only — full Looking Ahead / Looking Back narration lives in The Coach card.
 */
export function PeriodTravelBanner() {
    const t = useTranslations('pages.shell');
    const locale = useLocale();
    const { period, setPeriod } = useHouseholdShell();
    const travel = describePeriodTravel(period);
    const labels = formatPeriodTravelLabels(travel, t);

    if (travel.direction === 'current') return null;

    const stamp = formatPeriodStamp(period.year, period.month, locale);
    const past = travel.direction === 'past';

    return (
        <div
            role="status"
            className={cn(
                'mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5',
                past ? 'border-warning bg-warning/10' : 'border-accent bg-accent-soft'
            )}>
            <div className="min-w-0">
                <p
                    className={cn(
                        'font-mono text-[10px] font-semibold tracking-[0.14em] uppercase',
                        past ? 'text-warning' : 'text-accent'
                    )}>
                    {past ? t('period_looking_back') : t('period_looking_ahead')}
                </p>
                <p className="mt-0.5 text-sm text-fg">
                    {t('period_travel.viewing')} <span className="font-medium">{stamp}</span>
                    <span className="text-fg-muted">
                        {' '}
                        · {labels.relativeLabel}
                        {labels.daysLabel ? ` · ${labels.daysLabel}` : ''}
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
                    'min-h-9 shrink-0 rounded-full border px-3 py-1.5 font-mono text-xs font-medium tracking-wide uppercase transition-colors',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                    past
                        ? 'border-warning text-warning hover:bg-warning/15'
                        : 'border-accent text-accent hover:bg-accent/15'
                )}>
                {t('period_options.this_month')}
            </button>
        </div>
    );
}
