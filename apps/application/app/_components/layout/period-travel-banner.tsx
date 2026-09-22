'use client';

import { useLocale, useTranslations } from '@rumtelo/i18n';
import { cn, describePeriodTravel } from '@rumtelo/utils';

import { formatPeriodTravelLabels } from '@/app/_lib/period-travel-i18n';
import { useAppShell } from '@/components/features/shell/app-shell-context';

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
    const { period, setPeriod } = useAppShell();
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
                past ? 'border-amber-500/35 bg-amber-500/8' : 'border-accent/35 bg-accent-soft'
            )}>
            <div className="min-w-0">
                <p
                    className={cn(
                        'font-mono text-[10px] font-semibold tracking-[0.14em] uppercase',
                        past ? 'text-amber-800 dark:text-amber-300' : 'text-accent'
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
                    'shrink-0 rounded-full border px-3 py-1.5 font-mono text-[10px] font-medium tracking-wide uppercase transition-colors',
                    past
                        ? 'border-amber-600/40 text-amber-900 hover:bg-amber-500/15 dark:text-amber-200'
                        : 'border-accent/50 text-accent hover:bg-accent-soft'
                )}>
                {t('period_options.this_month')}
            </button>
        </div>
    );
}
