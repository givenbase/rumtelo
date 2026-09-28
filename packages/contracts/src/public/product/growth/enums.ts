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
