/** Money-domain string enums — jars, ledger, targets, cadence. */

export enum JarKey {
    NECESSITIES = 'NECESSITIES',
    FINANCIAL_FREEDOM = 'FINANCIAL_FREEDOM',
    EDUCATION = 'EDUCATION',
    LONG_TERM_SAVINGS = 'LONG_TERM_SAVINGS',
    PLAY = 'PLAY',
    GIVE = 'GIVE',
}

export enum DebtKind {
    CREDIT_CARD = 'CREDIT_CARD',
    LOAN = 'LOAN',
    STUDENT = 'STUDENT',
    MORTGAGE = 'MORTGAGE',
    FAMILY = 'FAMILY',
    OTHER = 'OTHER',
}

/**
 * OPEN = no end date (min + cadence drive estimates).
 * TERM = fixed number of payments at paymentCadence.
 * DEADLINE = pay off by maturityOn.
 */
export enum DebtScheduleKind {
    OPEN = 'OPEN',
    TERM = 'TERM',
    DEADLINE = 'DEADLINE',
}

/**
 * Avalanche = highest rate first (cheapest interest).
 * Snowball = smallest balance first (faster wins).
 * Minimal = contractual minimums only — no extra, no rollover.
 */
export enum PayoffStrategy {
    AVALANCHE = 'AVALANCHE',
    SNOWBALL = 'SNOWBALL',
    MINIMAL = 'MINIMAL',
}

export enum IncomeKind {
    SALARY = 'SALARY',
    FREELANCE = 'FREELANCE',
    BENEFIT = 'BENEFIT',
    RENTAL = 'RENTAL',
    DIVIDEND = 'DIVIDEND',
    OTHER = 'OTHER',
}

export enum GoalStatus {
    ACTIVE = 'ACTIVE',
    REACHED = 'REACHED',
    PAUSED = 'PAUSED',
    ARCHIVED = 'ARCHIVED',
}

/**
 * SAVE = fund a jar target; EARN = reach a monthly net-income desire;
 * GIVE = a yearly pledge, filled by money that leaves the Give jar.
 */
export enum GoalKind {
    SAVE = 'SAVE',
    EARN = 'EARN',
    GIVE = 'GIVE',
}

/** Editorial pin on a MerchantPreset — sorts to the top and shows a chip. */
export enum MerchantHighlight {
    FEATURED = 'FEATURED',
    NEW = 'NEW',
    POPULAR = 'POPULAR',
}

/** Where a household wants its giving to land. Catalog filter for GivingOrganisation. */
export enum GivingCause {
    GLOBAL_HEALTH = 'GLOBAL_HEALTH',
    POVERTY = 'POVERTY',
    EDUCATION = 'EDUCATION',
    CLIMATE = 'CLIMATE',
    ANIMALS = 'ANIMALS',
    COMMUNITY = 'COMMUNITY',
    EMERGENCY = 'EMERGENCY',
    WATER = 'WATER',
}

/**
 * Independent evaluators / registers a GivingOrganisation can cite.
 * Each one measures something different — the app explains what, and tiers
 * them: evidence of impact › governance & transparency › tax status.
 */
export enum GivingEvaluator {
    GIVEWELL = 'GIVEWELL',
    GIVING_WHAT_WE_CAN = 'GIVING_WHAT_WE_CAN',
    FOUNDERS_PLEDGE = 'FOUNDERS_PLEDGE',
    GIVING_GREEN = 'GIVING_GREEN',
    ANIMAL_CHARITY_EVALUATORS = 'ANIMAL_CHARITY_EVALUATORS',
    DONEER_EFFECTIEF = 'DONEER_EFFECTIEF',
    CHARITY_NAVIGATOR = 'CHARITY_NAVIGATOR',
    CBF = 'CBF',
    ANBI = 'ANBI',
}

/**
 * What a giving signal is evidence of. Never let governance or tax
 * read as proof of impact — UI tiers keep that honest.
 */
export enum GivingSignalTier {
    IMPACT = 'impact',
    GOVERNANCE = 'governance',
    TAX = 'tax',
}

export enum AccountKind {
    CHECKING = 'CHECKING',
    SAVINGS = 'SAVINGS',
    CREDIT = 'CREDIT',
    CASH = 'CASH',
    INVESTMENT = 'INVESTMENT',
}

export enum TransactionStatus {
    INBOX = 'INBOX',
    SORTED = 'SORTED',
    IGNORED = 'IGNORED',
}

export enum TransactionSource {
    MANUAL = 'MANUAL',
    CSV = 'CSV',
    BANK = 'BANK',
    RECURRING = 'RECURRING',
}

/** Whether a fixed-cost period was settled with a payment or intentionally skipped. */
export enum FixedCostSettlementStatus {
    PAID = 'PAID',
    SKIPPED = 'SKIPPED',
}

/**
 * Derived UI status for a fixed cost in a budget period
 * (settlement + due-day heuristics — not a DB column).
 */
export enum FixedCostPeriodStatus {
    TAKEN = 'TAKEN',
    DUE = 'DUE',
    UPCOMING = 'UPCOMING',
    SKIPPED = 'SKIPPED',
}

/** Lifecycle derived from isActive + endsOn — not a separate status column. */
export enum FixedCostLifecycle {
    ACTIVE = 'ACTIVE',
    PAUSED = 'PAUSED',
    ENDED = 'ENDED',
}

/** How the period settlement was recorded. */
export enum FixedCostSettlementSource {
    MATCHED = 'MATCHED',
    MARK_PAID = 'MARK_PAID',
    SKIP = 'SKIP',
    LINKED = 'LINKED',
}

/** Preferred statement file format for household import (local preference). */
export enum StatementImportPreferredFormat {
    CAMT053 = 'CAMT053',
    MT940 = 'MT940',
    CSV = 'CSV',
}

export enum RuleField {
    DESCRIPTION = 'DESCRIPTION',
    COUNTERPARTY = 'COUNTERPARTY',
    AMOUNT = 'AMOUNT',
}

export enum RuleMatcher {
    CONTAINS = 'CONTAINS',
    EQUALS = 'EQUALS',
    STARTS_WITH = 'STARTS_WITH',
    REGEX = 'REGEX',
}

export enum WeekCheckStage {
    LOOK = 'LOOK',
    REDIRECT = 'REDIRECT',
    INTEND = 'INTEND',
    DONE = 'DONE',
}

export enum MonthScoreEventKind {
    JAR_HELD = 'JAR_HELD',
    JAR_OVERSPENT = 'JAR_OVERSPENT',
    INBOX_CLEARED = 'INBOX_CLEARED',
    WEEK_CHECK_DONE = 'WEEK_CHECK_DONE',
    GOAL_REACHED = 'GOAL_REACHED',
    DEBT_CLEARED = 'DEBT_CLEARED',
    INCOME_LOGGED = 'INCOME_LOGGED',
    STREAK_KEPT = 'STREAK_KEPT',
}
