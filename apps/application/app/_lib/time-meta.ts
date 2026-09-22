/**
 * Display metadata for the time diary: labels, colours and status copy.
 * Bands, sources and kinds come from `@rumtelo/contracts` — this file is chrome only.
 */

import type { BadgeTone } from '@rumtelo/ui';
import {
    TimeBandRegion,
    TimeBandStatus,
    TimeCategory,
    TimeEvidence,
    TimeKind,
} from '@rumtelo/contracts';
import type { TranslateFn } from '@rumtelo/i18n';

const TIME_CATEGORY_I18N_KEY: Record<TimeCategory, string> = {
    [TimeCategory.SLEEP]: 'sleep',
    [TimeCategory.PERSONAL_CARE]: 'personal_care',
    [TimeCategory.PAID_WORK]: 'paid_work',
    [TimeCategory.STUDY]: 'study',
    [TimeCategory.HOUSEHOLD_CARE]: 'household_care',
    [TimeCategory.FAMILY_CARE]: 'family_care',
    [TimeCategory.TRAVEL]: 'travel',
    [TimeCategory.EXERCISE]: 'exercise',
    [TimeCategory.SOCIAL]: 'social',
    [TimeCategory.STILLNESS]: 'stillness',
    [TimeCategory.HOBBIES]: 'hobbies',
    [TimeCategory.VOLUNTEERING]: 'volunteering',
    [TimeCategory.SCREEN]: 'screen',
    [TimeCategory.FREE_OTHER]: 'free_other',
};

const TIME_KIND_I18N_KEY: Record<TimeKind, string> = {
    [TimeKind.PERSONAL]: 'personal',
    [TimeKind.PAID]: 'paid',
    [TimeKind.UNPAID]: 'unpaid',
    [TimeKind.FREE]: 'free',
};

const TIME_STATUS_I18N_KEY: Record<TimeBandStatus, string> = {
    [TimeBandStatus.NO_DATA]: 'no_data',
    [TimeBandStatus.INCOMPLETE_WEEK]: 'incomplete_week',
    [TimeBandStatus.BELOW_FLOOR]: 'below_floor',
    [TimeBandStatus.BELOW_TARGET]: 'below_target',
    [TimeBandStatus.ON_TARGET]: 'on_target',
    [TimeBandStatus.ABOVE_TARGET]: 'above_target',
    [TimeBandStatus.ABOVE_CEILING]: 'above_ceiling',
};

const TIME_EVIDENCE_I18N_KEY: Record<TimeEvidence, string> = {
    [TimeEvidence.GUIDELINE]: 'guideline',
    [TimeEvidence.STUDY]: 'study',
    [TimeEvidence.BENCHMARK]: 'benchmark',
};

const TIME_REGION_I18N_KEY: Record<TimeBandRegion, string> = {
    [TimeBandRegion.GLOBAL]: 'global',
    [TimeBandRegion.EUROPE]: 'europe',
    [TimeBandRegion.NORTH_AMERICA]: 'north_america',
    [TimeBandRegion.ASIA]: 'asia',
    [TimeBandRegion.AFRICA]: 'africa',
};

/** Localized category label — icons stay in {@link TIME_CATEGORY_META}. */
export function timeCategoryName(t: TranslateFn, category: TimeCategory): string {
    return t(`category.${TIME_CATEGORY_I18N_KEY[category]}`);
}

/** Localized category hint for cards and the day log form. */
export function timeCategoryHint(t: TranslateFn, category: TimeCategory): string {
    return t(`category_hint.${TIME_CATEGORY_I18N_KEY[category]}`);
}

/** Localized time-kind label for the 168-hour bar and forecast. */
export function timeKindName(t: TranslateFn, kind: TimeKind): string {
    return t(`kind.${TIME_KIND_I18N_KEY[kind]}`);
}

/** Localized time-kind blurb for the 168-hour bar legend. */
export function timeKindBlurb(t: TranslateFn, kind: TimeKind): string {
    return t(`kind_blurb.${TIME_KIND_I18N_KEY[kind]}`);
}

/** Localized band status label for badges. */
export function timeStatusName(t: TranslateFn, status: TimeBandStatus): string {
    return t(`status.${TIME_STATUS_I18N_KEY[status]}`);
}

/** Localized evidence grade label (guideline, study, benchmark). */
export function timeEvidenceName(t: TranslateFn, evidence: TimeEvidence): string {
    return t(`evidence.${TIME_EVIDENCE_I18N_KEY[evidence]}.name`);
}

/** Localized evidence grade explanation. */
export function timeEvidenceBlurb(t: TranslateFn, evidence: TimeEvidence): string {
    return t(`evidence.${TIME_EVIDENCE_I18N_KEY[evidence]}.blurb`);
}

/** Localized region label for source citations. */
export function timeRegionName(t: TranslateFn, region: TimeBandRegion): string {
    return t(`region.${TIME_REGION_I18N_KEY[region]}`);
}

export const TIME_CATEGORY_META: Record<TimeCategory, { icon: string }> = {
    [TimeCategory.SLEEP]: { icon: '🌙' },
    [TimeCategory.PERSONAL_CARE]: { icon: '🫧' },
    [TimeCategory.PAID_WORK]: { icon: '💼' },
    [TimeCategory.STUDY]: { icon: '📚' },
    [TimeCategory.HOUSEHOLD_CARE]: { icon: '🧺' },
    [TimeCategory.FAMILY_CARE]: { icon: '👶' },
    [TimeCategory.TRAVEL]: { icon: '🚲' },
    [TimeCategory.EXERCISE]: { icon: '🏃' },
    [TimeCategory.SOCIAL]: { icon: '🫶' },
    [TimeCategory.STILLNESS]: { icon: '🕯️' },
    [TimeCategory.HOBBIES]: { icon: '🎨' },
    [TimeCategory.VOLUNTEERING]: { icon: '🤲' },
    [TimeCategory.SCREEN]: { icon: '📺' },
    [TimeCategory.FREE_OTHER]: { icon: '◌' },
};

export const TIME_KIND_META: Record<TimeKind, { color: string }> = {
    [TimeKind.PERSONAL]: { color: 'var(--color-jar-lts)' },
    [TimeKind.PAID]: { color: 'var(--color-jar-ff)' },
    [TimeKind.UNPAID]: { color: 'var(--color-jar-nec)' },
    [TimeKind.FREE]: { color: 'var(--color-accent)' },
};

export const TIME_KIND_ORDER: readonly TimeKind[] = [
    TimeKind.PERSONAL,
    TimeKind.PAID,
    TimeKind.UNPAID,
    TimeKind.FREE,
];

export const TIME_STATUS_META: Record<TimeBandStatus, { tone: BadgeTone }> = {
    [TimeBandStatus.NO_DATA]: { tone: 'neutral' },
    [TimeBandStatus.INCOMPLETE_WEEK]: { tone: 'neutral' },
    [TimeBandStatus.BELOW_FLOOR]: { tone: 'danger' },
    [TimeBandStatus.BELOW_TARGET]: { tone: 'warning' },
    [TimeBandStatus.ON_TARGET]: { tone: 'success' },
    [TimeBandStatus.ABOVE_TARGET]: { tone: 'warning' },
    [TimeBandStatus.ABOVE_CEILING]: { tone: 'danger' },
};

const DURATION = 'common.duration';

/** Compact hour value for band targets — e.g. "7h" or "7.5h". */
export function formatBandHours(minutes: number, perDay: boolean, t?: TranslateFn): string {
    const hours = (perDay ? minutes / 7 : minutes) / 60;
    if (t) {
        const key = Number.isInteger(hours)
            ? `${DURATION}.band_hours`
            : `${DURATION}.band_hours_decimal`;
        return t(key, { hours: Number.isInteger(hours) ? hours : hours.toFixed(1) });
    }
    return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`;
}

/** "7h 30m" for card numbers, "0m" when nothing logged. Pass root `t` from `useTranslations()`. */
export function formatMinutes(minutes: number, t?: TranslateFn): string {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    if (t) {
        if (hours === 0) return t(`${DURATION}.minutes_only`, { minutes: rest });
        if (rest === 0) return t(`${DURATION}.hours_only`, { hours });
        return t(`${DURATION}.hours_minutes`, { hours, minutes: rest });
    }
    if (hours === 0) return `${rest}m`;
    return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

/** Compact "7–9h" style range for a band, per day or per week. Pass root `t` from `useTranslations()`. */
export function formatBandRange(
    low: number | null,
    high: number | null,
    perDay: boolean,
    t?: TranslateFn
): string | null {
    const show = (value: number) => formatBandHours(value, perDay, t);
    if (low !== null && high !== null) {
        return t
            ? t(`${DURATION}.band_between`, { low: show(low), high: show(high) })
            : `${show(low)}–${show(high)}`;
    }
    if (low !== null) {
        return t ? t(`${DURATION}.band_at_least`, { value: show(low) }) : `≥ ${show(low)}`;
    }
    if (high !== null) {
        return t ? t(`${DURATION}.band_at_most`, { value: show(high) }) : `≤ ${show(high)}`;
    }
    return null;
}
