import { JarKey } from '@rumtelo/contracts';
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

type CoachJar = { id: string; key: JarKey; name: string; percentage: number };

export type OverNecessities = {
    jarName: string;
    /** What Necessities is allocated per month (minor units). */
    envelopeCents: number;
    /** Monthly OUT on Necessities minus the envelope; always above zero. */
    shortfallCents: number;
    /** Largest monthly bill on the Necessities jar — the secondary move. */
    biggestBillId: string;
};

/** OUT bills that count this month (active, inside their start/end dates). */
function applyingOutBills(bills: readonly CoachBill[], asOf: string): CoachBill[] {
    return bills.filter(bill => bill.direction === 'OUT' && fixedCostAppliesAsOf(bill, asOf));
}

/**
 * Fixed costs on the Necessities jar that exceed what the split gives it.
 *
 * Same rule as the jar meter: the envelope is the household's monthly net income split with
 * `allocateByPercentage` (remainder to the largest share), and the commitment is the
 * monthly-normalised OUT on that jar as of `asOf`. Null while there is no income to split, no
 * Necessities jar, or the bills fit. Integer minor units throughout.
 */
export function evaluateOverNecessities(input: {
    netMonthlyCents: number;
    jars: readonly CoachJar[];
    bills: readonly CoachBill[];
    asOf: string;
}): OverNecessities | null {
    const necessities = input.jars.find(jar => jar.key === JarKey.NECESSITIES);
    if (!necessities || input.netMonthlyCents <= 0) return null;

    const envelopeCents =
        allocateByPercentage(
            input.netMonthlyCents,
            input.jars.map(jar => ({ id: jar.id, percentage: jar.percentage }))
        ).find(share => share.id === necessities.id)?.amount ?? 0;

    const onNecessities = applyingOutBills(input.bills, input.asOf)
        .filter(bill => bill.jarId === necessities.id)
        .map(bill => ({ bill, monthly: monthlyAmount(Math.abs(bill.amount), bill.cadence) }));
    const committedCents = onNecessities.reduce((total, row) => total + row.monthly, 0);
    const shortfallCents = committedCents - envelopeCents;
    if (shortfallCents <= 0) return null;

    // Biggest first; the name breaks a tie so the same data always picks the same bill.
    const [biggest] = [...onNecessities].sort(
        (left, right) =>
            right.monthly - left.monthly || left.bill.name.localeCompare(right.bill.name)
    );
    if (!biggest) return null;

    return {
        jarName: necessities.name,
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
