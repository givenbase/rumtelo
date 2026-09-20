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

export const TIME_CATEGORY_META: Record<
    TimeCategory,
    { name: string; icon: string; hint: string }
> = {
    [TimeCategory.SLEEP]: { name: 'Sleep', icon: '🌙', hint: 'Night sleep and naps' },
    [TimeCategory.PERSONAL_CARE]: {
        name: 'Personal care',
        icon: '🫧',
        hint: 'Eating, washing, dressing',
    },
    [TimeCategory.PAID_WORK]: { name: 'Paid work', icon: '💼', hint: 'Main and second job' },
    [TimeCategory.STUDY]: { name: 'Study', icon: '📚', hint: 'Courses, homework, learning' },
    [TimeCategory.HOUSEHOLD_CARE]: {
        name: 'Household',
        icon: '🧺',
        hint: 'Cooking, cleaning, shopping, admin',
    },
    [TimeCategory.FAMILY_CARE]: {
        name: 'Family care',
        icon: '👶',
        hint: 'Children and adults you care for',
    },
    [TimeCategory.TRAVEL]: { name: 'Travel', icon: '🚲', hint: 'Commute and other travel' },
    [TimeCategory.EXERCISE]: { name: 'Exercise', icon: '🏃', hint: 'Sport, training, brisk walks' },
    [TimeCategory.SOCIAL]: { name: 'Social', icon: '🫶', hint: 'Friends, family, going out' },
    [TimeCategory.STILLNESS]: { name: 'Stillness', icon: '🕯️', hint: 'Rest, meditation, prayer' },
    [TimeCategory.HOBBIES]: { name: 'Hobbies', icon: '🎨', hint: 'Making, playing, collecting' },
    [TimeCategory.VOLUNTEERING]: {
        name: 'Volunteering',
        icon: '🤲',
        hint: 'Helping outside your household',
    },
    [TimeCategory.SCREEN]: { name: 'Screen', icon: '📺', hint: 'TV, scrolling, gaming (leisure)' },
    [TimeCategory.FREE_OTHER]: {
        name: 'Other free time',
        icon: '◌',
        hint: 'Free time you did not split further',
    },
};

export const TIME_KIND_META: Record<TimeKind, { name: string; color: string; blurb: string }> = {
    [TimeKind.PERSONAL]: {
        name: 'Body',
        color: 'var(--color-jar-lts)',
        blurb: 'Sleep, eating, hygiene',
    },
    [TimeKind.PAID]: { name: 'Paid', color: 'var(--color-jar-ff)', blurb: 'Work and study' },
    [TimeKind.UNPAID]: {
        name: 'Unpaid',
        color: 'var(--color-jar-nec)',
        blurb: 'Household, care, travel',
    },
    [TimeKind.FREE]: {
        name: 'You steer',
        color: 'var(--color-accent)',
        blurb: 'Everything you choose',
    },
};

export const TIME_KIND_ORDER: readonly TimeKind[] = [
    TimeKind.PERSONAL,
    TimeKind.PAID,
    TimeKind.UNPAID,
    TimeKind.FREE,
];

export const TIME_STATUS_META: Record<TimeBandStatus, { name: string; tone: BadgeTone }> = {
    [TimeBandStatus.NO_DATA]: { name: 'No band', tone: 'neutral' },
    [TimeBandStatus.INCOMPLETE_WEEK]: { name: 'Full week needed', tone: 'neutral' },
    [TimeBandStatus.BELOW_FLOOR]: { name: 'Below floor', tone: 'danger' },
    [TimeBandStatus.BELOW_TARGET]: { name: 'Under range', tone: 'warning' },
    [TimeBandStatus.ON_TARGET]: { name: 'In range', tone: 'success' },
    [TimeBandStatus.ABOVE_TARGET]: { name: 'Above range', tone: 'warning' },
    [TimeBandStatus.ABOVE_CEILING]: { name: 'Above ceiling', tone: 'danger' },
};

export const TIME_EVIDENCE_META: Record<TimeEvidence, { name: string; blurb: string }> = {
    [TimeEvidence.GUIDELINE]: {
        name: 'Guideline',
        blurb: 'Public-health recommendation from a national body or WHO',
    },
    [TimeEvidence.STUDY]: {
        name: 'Study',
        blurb: 'Peer-reviewed research — an association, not a prescription',
    },
    [TimeEvidence.BENCHMARK]: {
        name: 'Benchmark',
        blurb: 'Population average from a time-use survey',
    },
};

export const TIME_REGION_META: Record<TimeBandRegion, string> = {
    [TimeBandRegion.GLOBAL]: 'Global',
    [TimeBandRegion.EUROPE]: 'Europe',
    [TimeBandRegion.NORTH_AMERICA]: 'North America',
    [TimeBandRegion.ASIA]: 'Asia',
    [TimeBandRegion.AFRICA]: 'Africa',
};

/** "7h 30m" for card numbers, "0m" when nothing logged. */
export function formatMinutes(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    if (hours === 0) return `${rest}m`;
    return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

/** Compact "7–9h" style range for a band, per day or per week. */
export function formatBandRange(
    low: number | null,
    high: number | null,
    perDay: boolean
): string | null {
    const scale = (value: number) => (perDay ? value / 7 : value);
    const show = (value: number) => {
        const hours = scale(value) / 60;
        return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`;
    };
    if (low !== null && high !== null) return `${show(low)}–${show(high)}`;
    if (low !== null) return `≥ ${show(low)}`;
    if (high !== null) return `≤ ${show(high)}`;
    return null;
}
