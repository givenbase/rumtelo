import { parsePeriodKey, type PeriodTravel } from '@rumtelo/utils';

import type { TranslateFn } from '@rumtelo/i18n';

export type PeriodTravelScoreNoteInput = {
    period: string;
    locale: string;
    travel: Pick<PeriodTravel, 'direction' | 'monthsDelta'>;
    monthsHorizon: number;
    stackedTotal: number;
    formatMoney: (cents: number) => string;
    jarHighlights?: readonly { name: string; from: number; to: number }[];
    tDashboard: TranslateFn;
};

function formatPeriodStamp(period: string, locale: string): string {
    const { year, month } = parsePeriodKey(period);
    return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(
        new Date(Date.UTC(year, month - 1, 1))
    );
}

/**
 * Compact looking-back / looking-ahead line for Month score —
 * shorter than the Coach paragraph (no past_note, tighter stamp line).
 */
export function buildPeriodTravelScoreNote(input: PeriodTravelScoreNoteInput): string | null {
    if (input.travel.direction === 'current') return null;

    const stamp = formatPeriodStamp(input.period, input.locale);
    const money = input.formatMoney(input.stackedTotal);
    const horizon = input.monthsHorizon;
    const t = input.tDashboard;

    const lead =
        input.travel.direction === 'past'
            ? horizon === 1
                ? t('month_score.travel_past_one', { stamp, money, horizon })
                : t('month_score.travel_past_other', { stamp, money, horizon })
            : horizon === 1
              ? t('month_score.travel_ahead_one', { stamp, money, horizon })
              : t('month_score.travel_ahead_other', { stamp, money, horizon });

    const jars = input.jarHighlights
        ?.slice(0, 2)
        .map(jar =>
            t('month_score.travel_jar', {
                name: jar.name,
                from: input.formatMoney(jar.from),
                to: input.formatMoney(jar.to),
            })
        )
        .join(' · ');

    return jars ? `${lead} · ${jars}` : lead;
}
