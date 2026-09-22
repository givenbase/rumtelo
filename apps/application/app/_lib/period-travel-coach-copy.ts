import type { DashboardGoalAtPeriod } from '@rumtelo/contracts';
import type { TranslateFn } from '@rumtelo/i18n';
import {
    coachPeriodTravelCopy,
    parsePeriodKey,
    type GoalAtPeriod,
    type PeriodTravel,
} from '@rumtelo/utils';

import { formatPeriodTravelLabels } from '@/app/_lib/period-travel-i18n';

export type PeriodTravelCoachInput = {
    period: string;
    locale: string;
    travel: Pick<PeriodTravel, 'direction' | 'monthsDelta' | 'daysApprox'>;
    monthsHorizon: number;
    stackedTotal: number;
    formatMoney: (cents: number) => string;
    goalsAtPeriod?: readonly Pick<DashboardGoalAtPeriod, 'name' | 'incomeNeededCents'>[];
    jarHighlights?: readonly { name: string; from: number; to: number }[];
    tCoach: TranslateFn;
    tShell: TranslateFn;
};

function formatPeriodStamp(period: string, locale: string): string {
    const { year, month } = parsePeriodKey(period);
    return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(
        new Date(Date.UTC(year, month - 1, 1))
    );
}

function horizonKey(base: string, horizon: number): string {
    return horizon === 1 ? `${base}_one` : `${base}_other`;
}

/** Localized Coach paragraph for stacked period travel — mirrors `@rumtelo/utils` coachPeriodTravelCopy. */
export function buildPeriodTravelCoachText(input: PeriodTravelCoachInput): string | null {
    if (input.travel.direction === 'current') return null;

    const stamp = formatPeriodStamp(input.period, input.locale);
    const labels = formatPeriodTravelLabels(input.travel, input.tShell);
    const horizon = input.monthsHorizon;
    const t = input.tCoach;

    const jarHighlights = input.jarHighlights?.slice(0, 2).map(jar =>
        t('period_travel.jar_highlight', {
            name: jar.name,
            from: input.formatMoney(jar.from),
            to: input.formatMoney(jar.to),
        })
    );

    return coachPeriodTravelCopy({
        travel: {
            ...input.travel,
            relativeLabel: labels.relativeLabel,
            daysLabel: labels.daysLabel,
        },
        stamp,
        horizon,
        stackedTotal: input.stackedTotal,
        formatMoney: input.formatMoney,
        jarHighlights,
        goalsAtPeriod: input.goalsAtPeriod as readonly GoalAtPeriod[] | undefined,
        copy: {
            lookingBack: (stampValue, relativeLabel, money, horizonValue) =>
                t(horizonKey('period_travel.looking_back', horizonValue), {
                    stamp: stampValue,
                    relativeLabel,
                    money,
                    horizon: horizonValue,
                }),
            lookingAhead: (stampValue, money, horizonValue) =>
                t(horizonKey('period_travel.looking_ahead', horizonValue), {
                    stamp: stampValue,
                    money,
                    horizon: horizonValue,
                }),
            paceNeeded: (name, moneyPerMonth) =>
                t('period_travel.pace_needed', { name, money: moneyPerMonth }),
            pastNote: t('period_travel.past_note'),
        },
    });
}
