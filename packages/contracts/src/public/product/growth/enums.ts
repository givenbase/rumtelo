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

/** Layer of the Growth plan cascade, large to small. */
export enum PlanHorizon {
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
export enum PlanItemStatus {
    OPEN = 'OPEN',
    DONE = 'DONE',
    PARTIAL = 'PARTIAL',
    MISSED = 'MISSED',
    DROPPED = 'DROPPED',
    /** Pushed to the next period on purpose (snoozed); leaves the maths like DROPPED. */
    DEFERRED = 'DEFERRED',
}
