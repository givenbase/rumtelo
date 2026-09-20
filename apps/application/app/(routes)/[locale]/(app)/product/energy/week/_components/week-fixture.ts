import type { TimeWeekSummary } from '@rumtelo/contracts';
import {
    bandStatus,
    DISCRETIONARY_BAND,
    TIME_CATEGORY_KIND,
    TIME_REFERENCE,
    TimeCategory,
    TimeKind,
} from '@rumtelo/contracts';

import { weekKeyOf, weekRangeOf, todayIso } from '@/app/_lib/week-key';

/** Daily minutes for a plausible full-time week — preview mode only. */
const PREVIEW_DAILY: Record<TimeCategory, number> = {
    [TimeCategory.SLEEP]: 6 * 60 + 50,
    [TimeCategory.PERSONAL_CARE]: 95,
    [TimeCategory.PAID_WORK]: 6 * 60 + 25,
    [TimeCategory.STUDY]: 20,
    [TimeCategory.HOUSEHOLD_CARE]: 85,
    [TimeCategory.FAMILY_CARE]: 40,
    [TimeCategory.TRAVEL]: 55,
    [TimeCategory.EXERCISE]: 25,
    [TimeCategory.SOCIAL]: 70,
    [TimeCategory.STILLNESS]: 10,
    [TimeCategory.HOBBIES]: 30,
    [TimeCategory.VOLUNTEERING]: 5,
    [TimeCategory.SCREEN]: 2 * 60 + 40,
    [TimeCategory.FREE_OTHER]: 25,
};

const PREVIEW_ACCOUNT = '00000000-0000-7000-8000-000000000001';
const PREVIEW_PARTNER = '00000000-0000-7000-8000-000000000002';

/** Shape a summary exactly like the API would, so the page has one code path. */
export function previewWeekSummary(): TimeWeekSummary {
    const week = weekKeyOf(todayIso());
    const { from, to } = weekRangeOf(week);
    const daysLogged = 7;

    const categories = Object.values(TimeCategory).map(category => {
        const minutes = PREVIEW_DAILY[category] * daysLogged;
        return {
            category,
            kind: TIME_CATEGORY_KIND[category],
            minutes,
            dailyAverage: PREVIEW_DAILY[category],
            status: bandStatus(minutes, TIME_REFERENCE[category].band, daysLogged),
        };
    });

    const kinds = (scale: Partial<Record<TimeKind, number>> = {}) =>
        Object.values(TimeKind).reduce(
            (acc, kind) => {
                const minutes = categories
                    .filter(summary => summary.kind === kind)
                    .reduce((total, summary) => total + summary.minutes, 0);
                acc[kind] = Math.round(minutes * (scale[kind] ?? 1));
                return acc;
            },
            {} as Record<TimeKind, number>
        );

    const mine = kinds();
    const discretionaryMinutes = mine[TimeKind.FREE];
    const loggedMinutes = Object.values(mine).reduce((total, minutes) => total + minutes, 0);

    return {
        week,
        from,
        to,
        daysLogged,
        loggedMinutes,
        unloggedMinutes: Math.max(0, daysLogged * 1440 - loggedMinutes),
        categories,
        discretionary: {
            minutes: discretionaryMinutes,
            dailyAverage: Math.round(discretionaryMinutes / daysLogged),
            status: bandStatus(discretionaryMinutes, DISCRETIONARY_BAND, daysLogged),
        },
        members: [
            { accountId: PREVIEW_ACCOUNT, daysLogged, minutes: mine },
            {
                accountId: PREVIEW_PARTNER,
                daysLogged,
                // The Stats SA pattern: less paid, roughly double the unpaid.
                minutes: kinds({
                    [TimeKind.PAID]: 0.6,
                    [TimeKind.UNPAID]: 1.9,
                    [TimeKind.FREE]: 0.85,
                }),
            },
        ],
    };
}
