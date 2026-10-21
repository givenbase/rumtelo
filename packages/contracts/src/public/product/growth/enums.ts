/**
 * Growth enums that do not grow.
 * A learning section is not here — it is a key, like a category key.
 * Course schools (Udemy, MasterClass, …) are MerchantPreset.key strings — not an enum.
 * @see LearnSectionKey in learn/learn.schema.ts
 * @see MerchantPreset.key — Learn watch.merchantKey points at the same key
 */
export enum LearnWatchKind {
    FILM = 'FILM',
    VIDEO = 'VIDEO',
    SERIES = 'SERIES',
    PODCAST = 'PODCAST',
    COURSE = 'COURSE',
}

/** Layer of the Growth Course (Koers) cascade, large to small. */
export enum CourseHorizon {
    YEAR = 'YEAR',
    QUARTER = 'QUARTER',
    MONTH = 'MONTH',
    WEEK = 'WEEK',
    DAY = 'DAY',
}

/**
 * Review state of a plan item. MISSED, DROPPED and DEFERRED are facts, not failures;
 * DROPPED (let go) and DEFERRED (pushed forward) leave the progress maths.
 */
export enum CourseItemStatus {
    OPEN = 'OPEN',
    DONE = 'DONE',
    PARTIAL = 'PARTIAL',
    MISSED = 'MISSED',
    DROPPED = 'DROPPED',
    /** Pushed to the next period on purpose (snoozed); leaves the maths like DROPPED. */
    DEFERRED = 'DEFERRED',
}

/**
 * Kind of routine. Both are patterns you keep, not choices you make: a routine never
 * takes one of the three Focus slots. Only a DISCIPLINE counts; a HABIT asks one thing,
 * "done today?", without a number.
 */
export enum CourseRhythmKind {
    /** Small, frequent, no counter ("read 10 minutes"). Always DAILY on its pattern days. */
    HABIT = 'HABIT',
    /** A countable promise ("train 3× a week"); its ticks fill the milestone above it. */
    DISCIPLINE = 'DISCIPLINE',
}

/** The period a rhythm's `target` counts in. DAILY always has target 1. */
export enum CourseRhythmCadence {
    DAILY = 'DAILY',
    WEEKLY = 'WEEKLY',
    MONTHLY = 'MONTHLY',
}

/** Portal a rhythm or schedule row belongs to — colour and icon only, never rules. */
export enum CourseArea {
    MONEY = 'MONEY',
    GROWTH = 'GROWTH',
    ENERGY = 'ENERGY',
    SOUL = 'SOUL',
}

/**
 * Lane of a row in Course (Today, Week) and the calendar feed. Every row shows its
 * lane as a badge, so a choice (FOCUS) never reads like a routine (RHYTHM, shown as
 * Habit or Discipline), a check Rumtelo asks for (CHECK) or a tip (ADVICE).
 */
export enum CourseLane {
    FOCUS = 'FOCUS',
    RHYTHM = 'RHYTHM',
    CHECK = 'CHECK',
    ADVICE = 'ADVICE',
}

/** What a schedule row is, within its lane. */
export enum CourseScheduleKind {
    /** This week's top 3 — one row from Monday to Sunday. */
    FOCUS_WEEK = 'FOCUS_WEEK',
    /** Today's top 3 (day layer on). */
    FOCUS_DAY = 'FOCUS_DAY',
    /** A routine on a day of its pattern. */
    RHYTHM = 'RHYTHM',
    /** Sunday: look back, set the next 3. */
    GROWTH_WEEK_CHECK = 'GROWTH_WEEK_CHECK',
    /** Money week check: surplus and one intention. */
    MONEY_WEEK_CHECK = 'MONEY_WEEK_CHECK',
    /** Close the money month on its last day. */
    MONTH_CLOSE = 'MONTH_CLOSE',
    /** Sleep from the Energy template against the 7–9 h advice. */
    SLEEP = 'SLEEP',
}

/** Checks whose reminder a person may snooze for one period (stored as `ritual`). */
export enum CourseRitual {
    MONTH_CLOSE = 'MONTH_CLOSE',
}
