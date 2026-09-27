/** Backoffice product-tier keys (Basic / Plus / Max) — closed commercial set. */

export enum PlanKey {
    BASIC = 'BASIC',
    PLUS = 'PLUS',
    MAX = 'MAX',
}

/**
 * What a capability unlocks in product terms.
 * `screen` = route / nav area; `action` = discrete verb (invite, …).
 */
export enum CapabilityKind {
    SCREEN = 'screen',
    ACTION = 'action',
}

/**
 * Purchasable **seat inventory** beyond the plan matrix — not a better-auth role.
 *
 * Better-auth / app roles stay: `owner` | `admin` | `member` | `viewer`.
 * This enum only answers “what kind of extra seat did they buy?”:
 * - {@link SeatAddonKind.CONTRIBUTOR} → may be assigned as **admin** or **member**
 * - {@link SeatAddonKind.VIEWER} → may be assigned as **viewer** only
 *
 * Owner is never purchased; the household/practice creator already holds that seat.
 */
export enum SeatAddonKind {
    CONTRIBUTOR = 'CONTRIBUTOR',
    VIEWER = 'VIEWER',
}
