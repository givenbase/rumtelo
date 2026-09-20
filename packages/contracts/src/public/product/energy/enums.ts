/** Energy-domain enums. */

export enum EnergyMetric {
    SLEEP = 'SLEEP',
    TRAIN = 'TRAIN',
    FOOD = 'FOOD',
    MIND = 'MIND',
}

export enum EnergyTrend {
    UP = 'UP',
    FLAT = 'FLAT',
    DOWN = 'DOWN',
}

/**
 * Where a day's minutes went. Collapsed from the Eurostat HETUS Activity Coding
 * List 2018 (the taxonomy every EU statistics office, incl. CBS, records time-use
 * diaries in) to the buckets a household will actually log. HETUS group in comments.
 */
export enum TimeCategory {
    /** HETUS 011 — night sleep + naps. */
    SLEEP = 'SLEEP',
    /** HETUS 02/03 — eating, washing, dressing. */
    PERSONAL_CARE = 'PERSONAL_CARE',
    /** HETUS 1 — main + second job, incl. breaks. */
    PAID_WORK = 'PAID_WORK',
    /** HETUS 2 — school, courses, homework, free-time study. */
    STUDY = 'STUDY',
    /** HETUS 31–37 — cooking, cleaning, shopping, admin, repairs. */
    HOUSEHOLD_CARE = 'HOUSEHOLD_CARE',
    /** HETUS 38/39 — childcare and care for adults. */
    FAMILY_CARE = 'FAMILY_CARE',
    /** HETUS 4 — organisational work, informal help, religious/participatory. */
    VOLUNTEERING = 'VOLUNTEERING',
    /** HETUS 51/52 — visits, celebrations, conversation, culture, going out. */
    SOCIAL = 'SOCIAL',
    /** HETUS 6 — sports and outdoor exercise. */
    EXERCISE = 'EXERCISE',
    /** HETUS 71 — arts, crafts, collecting, offline games. */
    HOBBIES = 'HOBBIES',
    /** HETUS 72/73/8 — TV, video, social media, gaming, scrolling (recreational only). */
    SCREEN = 'SCREEN',
    /** HETUS 53 — resting, time out, meditation, prayer. */
    STILLNESS = 'STILLNESS',
    /** HETUS 9 — commute and all other travel. */
    TRAVEL = 'TRAVEL',
    /** HETUS 998 — unspecified leisure. Free time the person did not split further. */
    FREE_OTHER = 'FREE_OTHER',
}

/** The two shapes most days copy. Weekdays are assigned to one of them per person. */
export enum TimeDayKind {
    WORKDAY = 'WORKDAY',
    DAY_OFF = 'DAY_OFF',
}

/**
 * System of National Accounts split used by every time-use survey (Stats SA, Eurostat).
 * Derived from category — never stored. `FREE` is Sharif et al.'s "discretionary time".
 */
export enum TimeKind {
    /** Sleep, eating, hygiene — the body's fixed costs. */
    PERSONAL = 'PERSONAL',
    /** Paid work and study. */
    PAID = 'PAID',
    /** Household and family care, travel — work nobody pays for. */
    UNPAID = 'UNPAID',
    /** Everything you choose. */
    FREE = 'FREE',
}

/** How strong the claim behind a band is. Never mix these on one axis in the UI. */
export enum TimeEvidence {
    /** Public-health guideline from a national body or WHO. */
    GUIDELINE = 'GUIDELINE',
    /** Peer-reviewed study; associations, not prescriptions. */
    STUDY = 'STUDY',
    /** Population average from a time-use survey. */
    BENCHMARK = 'BENCHMARK',
}

/** Where the evidence was produced. Bands are built from more than one region on purpose. */
export enum TimeBandRegion {
    GLOBAL = 'GLOBAL',
    EUROPE = 'EUROPE',
    NORTH_AMERICA = 'NORTH_AMERICA',
    ASIA = 'ASIA',
    AFRICA = 'AFRICA',
}

/** Where this week's minutes sit against a band. */
export enum TimeBandStatus {
    NO_DATA = 'NO_DATA',
    /** Weekly band, partial week — not judged yet. */
    INCOMPLETE_WEEK = 'INCOMPLETE_WEEK',
    BELOW_FLOOR = 'BELOW_FLOOR',
    BELOW_TARGET = 'BELOW_TARGET',
    ON_TARGET = 'ON_TARGET',
    ABOVE_TARGET = 'ABOVE_TARGET',
    ABOVE_CEILING = 'ABOVE_CEILING',
}
