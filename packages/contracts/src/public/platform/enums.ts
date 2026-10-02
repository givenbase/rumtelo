/** Platform / household / coach / practice enums. */

export enum HouseholdKind {
    FAMILY = 'FAMILY',
    PARTNERS = 'PARTNERS',
    FRIENDS = 'FRIENDS',
    SOLO = 'SOLO',
}

export enum HouseholdRole {
    /**
     * Creator of the household (or Practice) — 100% control.
     * Maps to better-auth `owner`. Never invited; always the founding account.
     */
    OWNER = 'OWNER',
    /**
     * High trust (~80% of owner) — org/member/invite mutations without being creator.
     * Maps to better-auth `admin`.
     */
    ADMIN = 'ADMIN',
    /**
     * Limited write access — can do day-to-day board work, not org admin.
     * Maps to better-auth `member`.
     */
    MEMBER = 'MEMBER',
    /**
     * Look-along only — read (possibly limited views); no mutations.
     * Maps to better-auth `viewer`.
     */
    VIEWER = 'VIEWER',
}

export enum CoachKind {
    NUDGE = 'NUDGE',
    WIN = 'WIN',
    WARNING = 'WARNING',
    INSIGHT = 'INSIGHT',
    WEEK_CHECK = 'WEEK_CHECK',
}

/**
 * Soft self-declared spending style — person-scoped.
 * Descriptive, never judgmental (“leans spender”).
 */
export enum SpendingStyle {
    SPENDER = 'SPENDER',
    SAVER = 'SAVER',
    BALANCED = 'BALANCED',
    UNKNOWN = 'UNKNOWN',
}

/**
 * Board-level income volatility — shared cash-flow picture for coaching.
 * NONE = no recurring inflow right now (same coaching case as ~€0 net).
 */
export enum IncomeStability {
    STABLE = 'STABLE',
    VARIABLE = 'VARIABLE',
    NONE = 'NONE',
}

/**
 * How familiar the household is with the six-jar method — drives bank-setup coaching.
 * Stored in `HouseholdAnswers` under {@link HouseholdAnswerKey.JAR_EXPERIENCE}.
 */
export enum JarExperience {
    /** Never used jars — suggest account layout. */
    NEW = 'NEW',
    /** Knows the idea — light tips, they map seats. */
    FAMILIAR = 'FAMILIAR',
    /** Already banking like jars — just record their seats. */
    SET_UP = 'SET_UP',
}

/** Staff role inside a Practice (B2B control plane). */
export enum PracticeRole {
    OWNER = 'OWNER',
    ADMIN = 'ADMIN',
    COACH = 'COACH',
}

/** Purpose of an address link on a Practice (one row per kind). */
export enum PracticeAddressKind {
    BILLING = 'BILLING',
    REGISTERED = 'REGISTERED',
}

/** Purpose of an address link on an Account (one row per kind). */
export enum AccountAddressKind {
    BILLING = 'BILLING',
    HOME = 'HOME',
    MAILING = 'MAILING',
}

/** Lifecycle of a Practice ↔ Household client link. */
export enum PracticeClientLinkStatus {
    INVITED = 'INVITED',
    ACTIVE = 'ACTIVE',
    REVOKED = 'REVOKED',
}

/** Email invite before a household exists (new signup or unfinished onboarding). */
export enum PracticeClientInviteStatus {
    PENDING = 'PENDING',
    ACCEPTED = 'ACCEPTED',
    REVOKED = 'REVOKED',
}

/**
 * Access granted to the Practice on a linked household (scope of the middle contract).
 *
 * Both VIEW and MANAGE start as INVITED when Practice invites. ACTIVE only after the
 * household OWNER/ADMIN accepts (`householdAcceptedAt`). MANAGE sponsorship applies
 * on accept — never unilaterally on invite.
 */
export enum PracticeClientAccess {
    VIEW = 'VIEW',
    MANAGE = 'MANAGE',
}

/**
 * Extensible control flags on a client link (billing sponsor, unlink, …).
 * Start minimal; add values without renaming the hinge model.
 */
export enum PracticeClientControlFlag {
    SPONSOR_PLAN = 'SPONSOR_PLAN',
    CAN_UNLINK = 'CAN_UNLINK',
}

/**
 * Practice Stripe subscription lifecycle (mirrors Stripe statuses we care about).
 * NONE = no subscription row / not started checkout.
 */
export enum PracticeSubscriptionStatus {
    NONE = 'NONE',
    TRIALING = 'TRIALING',
    ACTIVE = 'ACTIVE',
    PAST_DUE = 'PAST_DUE',
    UNPAID = 'UNPAID',
    CANCELED = 'CANCELED',
    INCOMPLETE = 'INCOMPLETE',
}

/** How a household device talks to Rumtelo (or will, after ingest). */
export enum DeviceConnection {
    BLUETOOTH = 'BLUETOOTH',
    WIFI = 'WIFI',
    CLOUD = 'CLOUD',
}

/**
 * What a device can sense or act on — product screens deep-link by capability.
 * Aligns with EnergyMetric where overlap exists (SLEEP / TRAIN→TRAINING / MIND).
 */
export enum DeviceCapability {
    SLEEP = 'SLEEP',
    STEPS = 'STEPS',
    TRAINING = 'TRAINING',
    HEART_RATE = 'HEART_RATE',
    ALARM = 'ALARM',
    MIND = 'MIND',
}
