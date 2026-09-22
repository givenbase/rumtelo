import type { TranslateFn } from '@rumtelo/i18n';
import type { PeriodTravel } from '@rumtelo/utils';

const PT = 'period_travel';

function formatRelativeSpan(absMonths: number, past: boolean, t: TranslateFn): string {
    if (absMonths === 1) {
        return past ? t(`${PT}.months_ago_one`) : t(`${PT}.months_ahead_one`);
    }
    if (absMonths < 12) {
        return past
            ? t(`${PT}.months_ago_other`, { count: absMonths })
            : t(`${PT}.months_ahead_other`, { count: absMonths });
    }

    const years = Math.floor(absMonths / 12);
    const rem = absMonths % 12;
    const yearPart = years === 1 ? t(`${PT}.year_one`) : t(`${PT}.years_other`, { count: years });

    if (rem === 0) {
        return past
            ? years === 1
                ? t(`${PT}.years_ago_one`)
                : t(`${PT}.years_ago_other`, { count: years })
            : years === 1
              ? t(`${PT}.years_ahead_one`)
              : t(`${PT}.years_ahead_other`, { count: years });
    }

    const monthPart = rem === 1 ? t(`${PT}.month_one`) : t(`${PT}.months_other`, { count: rem });
    return past
        ? t(`${PT}.years_months_ago`, { years: yearPart, months: monthPart })
        : t(`${PT}.years_months_ahead`, { years: yearPart, months: monthPart });
}

function formatDaysLabel(absDays: number, past: boolean, t: TranslateFn): string | null {
    if (absDays === 0) return null;
    if (absDays === 1) {
        return past ? t(`${PT}.days_ago_one`) : t(`${PT}.days_ahead_one`);
    }
    return past
        ? t(`${PT}.days_ago_other`, { count: absDays })
        : t(`${PT}.days_ahead_other`, { count: absDays });
}

/** Localized relative / days labels from {@link PeriodTravel} metadata (monthsDelta + direction). */
export function formatPeriodTravelLabels(
    travel: Pick<PeriodTravel, 'direction' | 'monthsDelta' | 'daysApprox'>,
    t: TranslateFn
): { relativeLabel: string; daysLabel: string | null } {
    if (travel.direction === 'current') {
        return {
            relativeLabel: t(`${PT}.this_month`),
            daysLabel: null,
        };
    }

    const absM = Math.abs(travel.monthsDelta);
    const absD = Math.abs(travel.daysApprox);
    const past = travel.direction === 'past';

    return {
        relativeLabel: formatRelativeSpan(absM, past, t),
        daysLabel: formatDaysLabel(absD, past, t),
    };
}
