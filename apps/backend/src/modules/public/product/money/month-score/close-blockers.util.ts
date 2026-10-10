import { type EntityManager } from '@mikro-orm/postgresql';

import { FixedCostPeriodStatus, TransactionStatus } from '@rumtelo/contracts';
import { countUnclearedRolledMonths, endOfPeriodIso, fixedCostPeriodStatus } from '@rumtelo/utils';

import { HouseholdScopedRepository } from '../../../../../common/household/household-scoped.repository';
import { Transaction } from '../ledger/transaction/transaction.entity';
import { FixedCost } from '../plan/fixed-cost/fixed-cost.entity';
import { FixedCostSettlement } from '../plan/fixed-cost/fixed-cost-settlement.entity';

export type MonthCloseDueBill = {
    fixedCostId: string;
    name: string;
    amount: number;
    arrearsMonths: number;
};

export type MonthCloseBlockers = {
    inboxCount: number;
    dueBillCount: number;
    /** Sample names for UI (max 3). */
    dueBillNames: string[];
    dueBills: MonthCloseDueBill[];
};

/** Open work that must be cleared before a period can close. */
export async function collectCloseBlockers(
    em: EntityManager,
    period: string
): Promise<MonthCloseBlockers> {
    const transactions = new HouseholdScopedRepository(em, Transaction);
    const fixedCosts = new HouseholdScopedRepository(em, FixedCost);
    const settlements = new HouseholdScopedRepository(em, FixedCostSettlement);

    const periodStart = `${period}-01`;
    const periodEnd = endOfPeriodIso(period);

    const [inboxCount, costs, allSettlements] = await Promise.all([
        transactions.count({
            status: TransactionStatus.INBOX,
            bookedOn: { $gte: periodStart, $lte: periodEnd },
        }),
        fixedCosts.find({ isActive: true }),
        settlements.find({}),
    ]);

    const byCostPeriod = new Map<string, FixedCostSettlement>();
    const byCostAll = new Map<string, FixedCostSettlement[]>();
    for (const row of allSettlements) {
        const costId = typeof row.fixedCost === 'string' ? row.fixedCost : row.fixedCost.id;
        byCostPeriod.set(`${costId}:${row.period}`, row);
        const list = byCostAll.get(costId) ?? [];
        list.push(row);
        byCostAll.set(costId, list);
    }

    const dueBills: MonthCloseDueBill[] = [];
    for (const cost of costs) {
        const settlement = byCostPeriod.get(`${cost.id}:${period}`);
        const status = fixedCostPeriodStatus(
            {
                isActive: cost.isActive,
                dueDay: cost.dueDay,
                dueMonth: cost.dueMonth,
                cadence: cost.cadence,
            },
            settlement ? { status: settlement.status } : null,
            period
        );
        if (status !== FixedCostPeriodStatus.DUE) continue;
        const costSettlements = byCostAll.get(cost.id) ?? [];
        dueBills.push({
            fixedCostId: cost.id,
            name: cost.name,
            amount: cost.amount,
            arrearsMonths: countUnclearedRolledMonths(
                costSettlements.map(row => ({
                    period: row.period,
                    status: row.status,
                    clearedByPeriod: row.clearedByPeriod,
                })),
                period
            ),
        });
    }

    return {
        inboxCount,
        dueBillCount: dueBills.length,
        dueBillNames: dueBills.slice(0, 3).map(bill => bill.name),
        dueBills,
    };
}

export function closeBlockersReady(blockers: MonthCloseBlockers): boolean {
    return blockers.inboxCount === 0 && blockers.dueBillCount === 0;
}
