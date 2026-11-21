import type { FixedCost, FixedCostSettlement } from '@rumtelo/contracts';
import { FixedCostPeriodStatus, FlowDirection } from '@rumtelo/contracts';
import { describePeriodTravel, endOfPeriodIso, isFixedCostCounting } from '@rumtelo/utils';

import { fixedCostStatus, settlementsByFixedCostId } from '@/app/_lib/fixed-cost-match';
import { listFixedCostsForPeriodView } from '@/app/_lib/period-plan-list';

/**
 * Fixed costs still due (or rolled over) this period, per jar id — the "open bills" chip.
 * Same rule the old Home drilldown used: counting OUT costs that apply as of the period end.
 */
export function openBillCountsByJar(
    fixedCosts: readonly FixedCost[],
    period: { year: number; month: number },
    settlements?: readonly FixedCostSettlement[]
): Map<string, number> {
    const settlementById = settlements ? settlementsByFixedCostId(settlements) : new Map();
    const asOf = endOfPeriodIso(`${period.year}-${String(period.month).padStart(2, '0')}`);
    const { direction } = describePeriodTravel(period);

    const countingByJar = new Map<string, FixedCost[]>();
    for (const cost of fixedCosts) {
        if (cost.direction !== FlowDirection.OUT || !isFixedCostCounting(cost)) continue;
        const bucket = countingByJar.get(cost.jarId);
        if (bucket) bucket.push(cost);
        else countingByJar.set(cost.jarId, [cost]);
    }

    const counts = new Map<string, number>();
    for (const [jarId, costs] of countingByJar) {
        const { applying } = listFixedCostsForPeriodView(costs, asOf, direction);
        let open = 0;
        for (const cost of applying) {
            const status = fixedCostStatus(cost, settlementById.get(cost.id), period);
            if (status === FixedCostPeriodStatus.DUE || status === FixedCostPeriodStatus.ROLLED) {
                open += 1;
            }
        }
        counts.set(jarId, open);
    }
    return counts;
}
