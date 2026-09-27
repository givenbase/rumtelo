import { fixedCostAppliesAsOf, incomeSourceApplies, type IncomeSourceForNet } from '@rumtelo/utils';

type TravelDirection = 'current' | 'past' | 'future';

type PlanDates = {
    startedOn?: string | null;
    endsOn?: string | null;
    isActive?: boolean;
};

/** Active plan row whose start is after the viewed period end. */
export function isScheduledLater(item: PlanDates, asOf: string): boolean {
    if (item.isActive === false) return false;
    const startedOn = item.startedOn?.slice(0, 10);
    return Boolean(startedOn && startedOn > asOf.slice(0, 10));
}

/**
 * Applying rows for totals + list for UI.
 * Past travel: applying only. Current / ahead: also show scheduled-later (Planned).
 */
export function listForPeriodView<T extends PlanDates>(
    items: readonly T[],
    asOf: string,
    travelDirection: TravelDirection,
    applies: (item: T, asOf: string) => boolean
): { applying: T[]; list: T[] } {
    const applying = items.filter(item => applies(item, asOf));
    if (travelDirection === 'past') return { applying, list: applying };
    const later = items.filter(item => isScheduledLater(item, asOf));
    return { applying, list: [...applying, ...later] };
}

export function listFixedCostsForPeriodView<T extends PlanDates>(
    items: readonly T[],
    asOf: string,
    travelDirection: TravelDirection
): { applying: T[]; list: T[] } {
    return listForPeriodView(items, asOf, travelDirection, (item, date) =>
        fixedCostAppliesAsOf(item, date)
    );
}

export function listIncomeForPeriodView<T extends PlanDates & IncomeSourceForNet>(
    items: readonly T[],
    asOf: string,
    travelDirection: TravelDirection
): { applying: T[]; list: T[] } {
    return listForPeriodView(items, asOf, travelDirection, (item, date) =>
        incomeSourceApplies(item, date)
    );
}
