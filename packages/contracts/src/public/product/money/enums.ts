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

/** Avalanche = highest rate first. Snowball = smallest balance first. */
export enum PayoffStrategy {
    AVALANCHE = 'AVALANCHE',
    SNOWBALL = 'SNOWBALL',
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
