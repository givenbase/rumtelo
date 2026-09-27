import {
    PlanKey,
    PRACTICE_PRICING_CATALOG,
    SEAT_ADDON_CATALOG,
    SeatAddonKind,
} from '@rumtelo/contracts';

/** Stable Stripe lookup keys — same string in test + live after seeding each account. */
export const STRIPE_PLAN_LOOKUP_KEYS = {
    [PlanKey.PLUS]: {
        month: 'rumtelo_plus_monthly',
        year: 'rumtelo_plus_yearly',
    },
    [PlanKey.MAX]: {
        month: 'rumtelo_max_monthly',
        year: 'rumtelo_max_yearly',
    },
} as const;

/** Reserved lookup keys for household seat add-ons (€2.50 / seat) — Stripe seed later. */
export const STRIPE_SEAT_ADDON_LOOKUP_KEYS = {
    [SeatAddonKind.CONTRIBUTOR]: SEAT_ADDON_CATALOG[SeatAddonKind.CONTRIBUTOR].lookupKey,
    [SeatAddonKind.VIEWER]: SEAT_ADDON_CATALOG[SeatAddonKind.VIEWER].lookupKey,
} as const;

export type PaidPlanKey = typeof PlanKey.PLUS | typeof PlanKey.MAX;
export type BillingInterval = 'month' | 'year';

/** Catalog used by the Stripe seed CLI (and display fallbacks). Amounts in major units. */
export const STRIPE_PLAN_CATALOG: Record<
    PaidPlanKey,
    {
        name: string;
        description: string;
        currency: 'eur';
        month: number;
        /** Yearly = 10× monthly (2 months free). */
        year: number;
    }
> = {
    [PlanKey.PLUS]: {
        name: 'Rumtelo Plus',
        description: 'Share the board with family or friends — debt, energy week, and goals.',
        currency: 'eur',
        month: 9,
        year: 90,
    },
    [PlanKey.MAX]: {
        name: 'Rumtelo Max',
        description: 'Full household seats, income curve, learning, and net worth.',
        currency: 'eur',
        month: 19,
        year: 190,
    },
};

/**
 * Stub catalog for seat add-ons — amounts in major units (€2.50).
 * CONTRIBUTOR seats are inventory for admin/member roles; VIEWER for viewer only.
 */
export const STRIPE_SEAT_ADDON_CATALOG = {
    [SeatAddonKind.CONTRIBUTOR]: {
        name: 'Rumtelo contributor seat',
        description: 'Extra admin or member seat (not a role — billing inventory).',
        currency: 'eur' as const,
        month: 2.5,
        lookupKey: STRIPE_SEAT_ADDON_LOOKUP_KEYS[SeatAddonKind.CONTRIBUTOR],
    },
    [SeatAddonKind.VIEWER]: {
        name: 'Rumtelo viewer seat',
        description: 'Extra viewer / look-along seat.',
        currency: 'eur' as const,
        month: 2.5,
        lookupKey: STRIPE_SEAT_ADDON_LOOKUP_KEYS[SeatAddonKind.VIEWER],
    },
} as const;

/** Stable lookup keys for Practice B2B subscription lines. */
export const STRIPE_PRACTICE_BASE_LOOKUP_KEY = PRACTICE_PRICING_CATALOG.base.lookupKey;
export const STRIPE_PRACTICE_SEAT_LOOKUP_KEY = PRACTICE_PRICING_CATALOG.staffSeat.lookupKey;
export const STRIPE_PRACTICE_CLIENT_LOOKUP_KEY = PRACTICE_PRICING_CATALOG.clientSeat.lookupKey;

/** Catalog: Practice base + staff seat + client seat (amounts in major EUR). */
export const STRIPE_PRACTICE_BASE_CATALOG = {
    name: 'Rumtelo Practice',
    description: 'Base monthly subscription for a Rumtelo Practice org.',
    currency: 'eur' as const,
    month: PRACTICE_PRICING_CATALOG.base.unitAmountCents / 100,
    lookupKey: STRIPE_PRACTICE_BASE_LOOKUP_KEY,
} as const;

export const STRIPE_PRACTICE_SEAT_CATALOG = {
    name: 'Rumtelo practice staff seat',
    description: 'Billable staff seat on a Rumtelo Practice.',
    currency: 'eur' as const,
    month: PRACTICE_PRICING_CATALOG.staffSeat.unitAmountCents / 100,
    lookupKey: STRIPE_PRACTICE_SEAT_LOOKUP_KEY,
} as const;

export const STRIPE_PRACTICE_CLIENT_CATALOG = {
    name: 'Rumtelo practice client seat',
    description: 'Active MANAGE client household on a Rumtelo Practice (VIEW is free).',
    currency: 'eur' as const,
    month: PRACTICE_PRICING_CATALOG.clientSeat.unitAmountCents / 100,
    lookupKey: STRIPE_PRACTICE_CLIENT_LOOKUP_KEY,
} as const;

export function stripeLookupKey(planKey: PaidPlanKey, interval: BillingInterval): string {
    return STRIPE_PLAN_LOOKUP_KEYS[planKey][interval];
}

const LOOKUP_TO_PLAN: Record<string, PaidPlanKey> = {
    [STRIPE_PLAN_LOOKUP_KEYS[PlanKey.PLUS].month]: PlanKey.PLUS,
    [STRIPE_PLAN_LOOKUP_KEYS[PlanKey.PLUS].year]: PlanKey.PLUS,
    [STRIPE_PLAN_LOOKUP_KEYS[PlanKey.MAX].month]: PlanKey.MAX,
    [STRIPE_PLAN_LOOKUP_KEYS[PlanKey.MAX].year]: PlanKey.MAX,
};

/** Map a Stripe Price `lookup_key` → Plus / Max (null if unknown). */
export function planKeyFromStripeLookupKey(
    lookupKey: string | null | undefined
): PaidPlanKey | null {
    if (!lookupKey) return null;
    return LOOKUP_TO_PLAN[lookupKey] ?? null;
}
