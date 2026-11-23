import { JarGroup, type JarKey, jarCapabilitiesFor, jarGroupFor } from '@rumtelo/contracts';
import { allocateByPercentage, fixedCostAppliesAsOf, monthlyAmount } from '@rumtelo/utils';

import { isSubscriptionFixedCost } from '../plan/fixed-cost/fixed-cost-cancellable.util';

/** The slice of a fixed cost the coach rules read (a subset of the contract `FixedCost`). */
export type CoachBill = {
    id: string;
    name: string;
    counterparty: string | null;
    jarId: string;
    amount: number;
    cadence: string;
    direction: string;
    isActive: boolean;
    startedOn: string | null;
    endsOn: string | null;
    presetKey: string | null;
    merchantKey: string | null;
};

/** No `name`: a pot's stored name changes with its group (Basics, then Fixed costs once refined). */
type CoachJar = { id: string; key: JarKey; percentage: number };

export type OverNecessities = {
    /** What the Basics pots that can carry bills are allocated per month (minor units). */
    envelopeCents: number;
    /** Monthly OUT on those pots minus the envelope; always above zero. */
    shortfallCents: number;
    /** Largest monthly bill on those pots — the secondary move. */
    biggestBillId: string;
};

/** OUT bills that count this month (active, inside their start/end dates). */
function applyingOutBills(bills: readonly CoachBill[], asOf: string): CoachBill[] {
    return bills.filter(bill => bill.direction === 'OUT' && fixedCostAppliesAsOf(bill, asOf));
}

/**
 * Fixed costs on the Basics pots that can carry bills, against what the split gives those
 * same pots.
 *
 * Basics is the NECESSITIES pot plus, when the household has turned it on, DAILY. Only pots
 * whose capabilities allow fixed costs count (`allowsFixedCosts`: today NECESSITIES only), on
 * both sides: with Daily on, slack in Daily cannot mask bills that overshoot the Fixed costs
 * pot, and with Basics as one pot nothing changes. Same rule as the jar meter: the monthly net
 * income is split with `allocateByPercentage` (remainder to the largest share), the envelope
 * is the sum of those pots, and the commitment is the monthly-normalised OUT on them as of
 * `asOf`. Null while there is no income to split, no such pot, or the bills fit. Integer minor
 * units throughout.
 */
export function evaluateOverNecessities(input: {
    netMonthlyCents: number;
    jars: readonly CoachJar[];
    bills: readonly CoachBill[];
    asOf: string;
}): OverNecessities | null {
    const basicsIds = new Set(
        input.jars
            .filter(
                jar =>
                    jarGroupFor(jar.key) === JarGroup.BASIS &&
                    jarCapabilitiesFor(jar.key).allowsFixedCosts
            )
            .map(jar => jar.id)
    );
    if (basicsIds.size === 0 || input.netMonthlyCents <= 0) return null;

    const envelopeCents = allocateByPercentage(
        input.netMonthlyCents,
        input.jars.map(jar => ({ id: jar.id, percentage: jar.percentage }))
    )
        .filter(share => basicsIds.has(share.id))
        .reduce((total, share) => total + share.amount, 0);

    const onBasics = applyingOutBills(input.bills, input.asOf)
        .filter(bill => basicsIds.has(bill.jarId))
        .map(bill => ({ bill, monthly: monthlyAmount(Math.abs(bill.amount), bill.cadence) }));
    const committedCents = onBasics.reduce((total, row) => total + row.monthly, 0);
    const shortfallCents = committedCents - envelopeCents;
    if (shortfallCents <= 0) return null;

    // Biggest first; the name breaks a tie so the same data always picks the same bill.
    const [biggest] = [...onBasics].sort(
        (left, right) =>
            right.monthly - left.monthly || left.bill.name.localeCompare(right.bill.name)
    );
    if (!biggest) return null;

    return {
        envelopeCents,
        shortfallCents,
        biggestBillId: biggest.bill.id,
    };
}

export type SubscriptionReview = {
    count: number;
    /** Monthly-normalised total of those subscriptions (minor units). */
    monthlyCents: number;
};

/** Active subscription-type bills (see `isSubscriptionFixedCost`); null when there are none. */
export function evaluateSubscriptionReview(input: {
    bills: readonly CoachBill[];
    asOf: string;
}): SubscriptionReview | null {
    const subscriptions = applyingOutBills(input.bills, input.asOf).filter(isSubscriptionFixedCost);
    if (subscriptions.length === 0) return null;
    return {
        count: subscriptions.length,
        monthlyCents: subscriptions.reduce(
            (total, bill) => total + monthlyAmount(Math.abs(bill.amount), bill.cadence),
            0
        ),
    };
}

/** Calendar quarter key of a date (UTC), e.g. `2026-Q4`. */
export function quarterKeyOf(date: Date): string {
    return `${date.getUTCFullYear()}-Q${Math.floor(date.getUTCMonth() / 3) + 1}`;
}
