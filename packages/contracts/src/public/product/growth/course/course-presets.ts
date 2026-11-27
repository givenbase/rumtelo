/**
 * Course goal presets (Growth · Koers)
 * Starting points for "Plan your year": a goal worth setting, the first step to take
 * and the routine that keeps it alive. Pure constants — no database catalog, no copy.
 *
 * Copy lives in i18n under `features.growth.course.preset.<key>.name | doneWhen`; the
 * first step and the routine name are full translation keys on the preset itself.
 * A preset is a suggestion: the person edits every word before anything is saved.
 *
 * Money presets respect the pots doctrine: planned future spends (emergency fund,
 * holiday, paying off a debt) draw on Long Term Savings, never on Financial Freedom,
 * which is for investing and is never spent.
 */

import { GoalKind, JarKey } from '../../money/enums';
import { WorkSituation } from '../../../platform/enums';
import { CourseArea, CourseRhythmCadence, CourseRhythmKind, CourseScope } from '../enums';

/** The routine a preset hangs under its goal; same shape as `courseRhythmCreate` input. */
export interface CoursePresetRhythm {
    kind: CourseRhythmKind;
    cadence: CourseRhythmCadence;
    /** Ticks per period; 1 for a DAILY habit. */
    target: number;
    /** Full translation key of the routine's name. */
    nameKey: string;
}

export interface CoursePreset {
    /** Stable snake_case id; also the i18n segment for `name` and `doneWhen`. */
    key: string;
    scope: CourseScope;
    area: CourseArea;
    /** Work situations this preset fits; `'ALL'` = everyone. */
    situations: WorkSituation[] | 'ALL';
    /** True when the goal is a Money goal with an amount (`contract.money.goals.create`). */
    hasAmount: boolean;
    /**
     * With an amount: SAVE = a total to put aside (spread with {@link monthlyAmountFor});
     * EARN = a monthly net income to reach. Omitted without an amount.
     */
    goalKind?: GoalKind;
    /** With a SAVE amount: the jar the goal draws on. Omitted for EARN and for no amount. */
    suggestedJarKey?: JarKey;
    /** Full translation key of the first month step. */
    firstStepKey: string;
    /** Optional routine under the goal. */
    rhythm?: CoursePresetRhythm;
}

/** Translation prefix of all preset copy. */
export const COURSE_PRESET_I18N_PREFIX = 'features.growth.course.preset';

/** Translation key of one field of a preset's copy (`name` or `doneWhen`). */
export function coursePresetCopyKey(key: string, field: 'name' | 'doneWhen'): string {
    return `${COURSE_PRESET_I18N_PREFIX}.${key}.${field}`;
}

const copy = (key: string, field: string): string => `${COURSE_PRESET_I18N_PREFIX}.${key}.${field}`;

const { EMPLOYED, SELF_EMPLOYED, BOTH, STUDENT, SEEKING } = WorkSituation;
const { PERSONAL, BUSINESS } = CourseScope;
const { MONEY, GROWTH, ENERGY, SOUL } = CourseArea;
const { HABIT, DISCIPLINE } = CourseRhythmKind;
const { DAILY, WEEKLY, MONTHLY } = CourseRhythmCadence;

/** Every preset, in the order shown when nothing else decides (personal first, then business). */
export const COURSE_PRESETS: readonly CoursePreset[] = [
    // ---- Personal: health and energy --------------------------------------------------
    {
        key: 'run_10k',
        scope: PERSONAL,
        area: ENERGY,
        situations: 'ALL',
        hasAmount: false,
        firstStepKey: copy('run_10k', 'firstStep'),
        rhythm: {
            kind: DISCIPLINE,
            cadence: WEEKLY,
            target: 3,
            nameKey: copy('run_10k', 'rhythm'),
        },
    },
    {
        key: 'sleep_7h',
        scope: PERSONAL,
        area: ENERGY,
        situations: 'ALL',
        hasAmount: false,
        firstStepKey: copy('sleep_7h', 'firstStep'),
        rhythm: { kind: HABIT, cadence: DAILY, target: 1, nameKey: copy('sleep_7h', 'rhythm') },
    },
    // ---- Personal: relationships ------------------------------------------------------
    {
        key: 'weekly_date',
        scope: PERSONAL,
        area: SOUL,
        situations: 'ALL',
        hasAmount: false,
        firstStepKey: copy('weekly_date', 'firstStep'),
        rhythm: {
            kind: DISCIPLINE,
            cadence: WEEKLY,
            target: 1,
            nameKey: copy('weekly_date', 'rhythm'),
        },
    },
    {
        key: 'family_time',
        scope: PERSONAL,
        area: SOUL,
        situations: 'ALL',
        hasAmount: false,
        firstStepKey: copy('family_time', 'firstStep'),
        rhythm: {
            kind: DISCIPLINE,
            cadence: WEEKLY,
            target: 1,
            nameKey: copy('family_time', 'rhythm'),
        },
    },
    // ---- Personal: growth -------------------------------------------------------------
    {
        key: 'read_12_books',
        scope: PERSONAL,
        area: GROWTH,
        situations: 'ALL',
        hasAmount: false,
        firstStepKey: copy('read_12_books', 'firstStep'),
        rhythm: {
            kind: HABIT,
            cadence: DAILY,
            target: 1,
            nameKey: copy('read_12_books', 'rhythm'),
        },
    },
    {
        key: 'learn_language',
        scope: PERSONAL,
        area: GROWTH,
        situations: 'ALL',
        hasAmount: false,
        firstStepKey: copy('learn_language', 'firstStep'),
        rhythm: {
            kind: DISCIPLINE,
            cadence: WEEKLY,
            target: 3,
            nameKey: copy('learn_language', 'rhythm'),
        },
    },
    // ---- Personal: money (SAVE goals; planned spends live in Long Term Savings) --------
    {
        key: 'emergency_buffer',
        scope: PERSONAL,
        area: MONEY,
        situations: 'ALL',
        hasAmount: true,
        goalKind: GoalKind.SAVE,
        suggestedJarKey: JarKey.LONG_TERM_SAVINGS,
        firstStepKey: copy('emergency_buffer', 'firstStep'),
    },
    {
        key: 'pay_off_debt',
        scope: PERSONAL,
        area: MONEY,
        situations: 'ALL',
        hasAmount: true,
        goalKind: GoalKind.SAVE,
        suggestedJarKey: JarKey.LONG_TERM_SAVINGS,
        firstStepKey: copy('pay_off_debt', 'firstStep'),
    },
    {
        key: 'holiday',
        scope: PERSONAL,
        area: MONEY,
        situations: 'ALL',
        hasAmount: true,
        goalKind: GoalKind.SAVE,
        suggestedJarKey: JarKey.LONG_TERM_SAVINGS,
        firstStepKey: copy('holiday', 'firstStep'),
    },
    // ---- Personal: soul ---------------------------------------------------------------
    {
        key: 'gratitude_routine',
        scope: PERSONAL,
        area: SOUL,
        situations: 'ALL',
        hasAmount: false,
        firstStepKey: copy('gratitude_routine', 'firstStep'),
        rhythm: {
            kind: HABIT,
            cadence: DAILY,
            target: 1,
            nameKey: copy('gratitude_routine', 'rhythm'),
        },
    },
    // ---- Business ---------------------------------------------------------------------
    {
        // EARN: the amount is a monthly net income, not a total.
        key: 'raise_income',
        scope: BUSINESS,
        area: MONEY,
        situations: 'ALL',
        hasAmount: true,
        goalKind: GoalKind.EARN,
        firstStepKey: copy('raise_income', 'firstStep'),
    },
    {
        key: 'new_clients',
        scope: BUSINESS,
        area: GROWTH,
        situations: [SELF_EMPLOYED, BOTH],
        hasAmount: false,
        firstStepKey: copy('new_clients', 'firstStep'),
        rhythm: {
            kind: DISCIPLINE,
            cadence: WEEKLY,
            target: 2,
            nameKey: copy('new_clients', 'rhythm'),
        },
    },
    {
        key: 'promotion_raise',
        scope: BUSINESS,
        area: GROWTH,
        situations: [EMPLOYED, BOTH],
        hasAmount: false,
        firstStepKey: copy('promotion_raise', 'firstStep'),
        rhythm: {
            kind: DISCIPLINE,
            cadence: MONTHLY,
            target: 1,
            nameKey: copy('promotion_raise', 'rhythm'),
        },
    },
    {
        key: 'find_work',
        scope: BUSINESS,
        area: GROWTH,
        situations: [SEEKING, STUDENT],
        hasAmount: false,
        firstStepKey: copy('find_work', 'firstStep'),
        rhythm: {
            kind: DISCIPLINE,
            cadence: WEEKLY,
            target: 3,
            nameKey: copy('find_work', 'rhythm'),
        },
    },
    {
        key: 'learn_work_skill',
        scope: BUSINESS,
        area: GROWTH,
        situations: 'ALL',
        hasAmount: false,
        firstStepKey: copy('learn_work_skill', 'firstStep'),
        rhythm: {
            kind: DISCIPLINE,
            cadence: WEEKLY,
            target: 2,
            nameKey: copy('learn_work_skill', 'rhythm'),
        },
    },
    {
        key: 'stop_at_18',
        scope: BUSINESS,
        area: ENERGY,
        situations: [EMPLOYED, SELF_EMPLOYED, BOTH],
        hasAmount: false,
        firstStepKey: copy('stop_at_18', 'firstStep'),
        rhythm: {
            kind: DISCIPLINE,
            cadence: WEEKLY,
            target: 5,
            nameKey: copy('stop_at_18', 'rhythm'),
        },
    },
];

/** One preset by key; undefined for an unknown key. */
export function coursePresetByKey(key: string): CoursePreset | undefined {
    return COURSE_PRESETS.find(preset => preset.key === key);
}

/** How well a preset fits a situation: 0 = made for it, 1 = for everyone, null = not for it. */
function fitRank(preset: CoursePreset, situation: WorkSituation): 0 | 1 | null {
    if (preset.situations === 'ALL') return 1;
    return preset.situations.includes(situation) ? 0 : null;
}

/**
 * Presets for a person, best fit first, optionally for one scope.
 * - With a situation: presets made for it first, then those for everyone; presets made for
 *   other situations are left out.
 * - Without one (`null`, not told): everyone's presets first, then the situation-specific ones.
 * Within a group the order of {@link COURSE_PRESETS} holds.
 */
export function presetsFor(situation: WorkSituation | null, scope?: CourseScope): CoursePreset[] {
    const scoped = COURSE_PRESETS.filter(preset => scope === undefined || preset.scope === scope);

    if (situation === null) {
        const everyone = scoped.filter(preset => preset.situations === 'ALL');
        const specific = scoped.filter(preset => preset.situations !== 'ALL');
        return [...everyone, ...specific];
    }

    const ranked: CoursePreset[][] = [[], []];
    for (const preset of scoped) {
        const rank = fitRank(preset, situation);
        if (rank !== null) ranked[rank]!.push(preset);
    }
    return [...ranked[0]!, ...ranked[1]!];
}

/**
 * Even monthly share of a yearly total, in minor units (cents), from `fromMonth` through
 * `toMonth` inclusive (1 = January). Integer maths only: the share rounds UP to a whole
 * cent so the goal is reached, never short. A range that is empty or inverted counts as
 * one month. Months outside 1–12 or a non-integer / negative total throw `RangeError`.
 */
export function monthlyAmountFor(totalMinor: number, fromMonth: number, toMonth = 12): number {
    if (!Number.isSafeInteger(totalMinor) || totalMinor < 0) {
        throw new RangeError('totalMinor must be a non-negative integer (minor units)');
    }
    for (const month of [fromMonth, toMonth]) {
        if (!Number.isInteger(month) || month < 1 || month > 12) {
            throw new RangeError('months must be integers from 1 to 12');
        }
    }
    const months = Math.max(1, toMonth - fromMonth + 1);
    return Math.floor((totalMinor + months - 1) / months);
}
