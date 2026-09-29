import { type EntityManager } from '@mikro-orm/postgresql';

import { FixedCostPeriodStatus, TransactionStatus } from '@rumtelo/contracts';
import { endOfPeriodIso, fixedCostPeriodStatus } from '@rumtelo/utils';

import { HouseholdScopedRepository } from '../../../../../common/household/household-scoped.repository';
import { Transaction } from '../ledger/transaction/transaction.entity';
import { FixedCost } from '../plan/fixed-cost/fixed-cost.entity';
import { FixedCostSettlement } from '../plan/fixed-cost/fixed-cost-settlement.entity';

export type MonthCloseBlockers = {
    inboxCount: number;
    dueBillCount: number;
    /** Sample names for UI (max 3). */
    dueBillNames: string[];
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

    const [inboxCount, costs, periodSettlements] = await Promise.all([
        transactions.count({
            status: TransactionStatus.INBOX,
            bookedOn: { $gte: periodStart, $lte: periodEnd },
        }),
        fixedCosts.find({ isActive: true }),
        settlements.find({ period }),
    ]);

    const byCost = new Map(
        periodSettlements.map(row => {
            const costId = typeof row.fixedCost === 'string' ? row.fixedCost : row.fixedCost.id;
            return [costId, row] as const;
        })
    );

    const dueNames: string[] = [];
    for (const cost of costs) {
        const settlement = byCost.get(cost.id);
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
        dueNames.push(cost.name);
    }

    return {
        inboxCount,
        dueBillCount: dueNames.length,
        dueBillNames: dueNames.slice(0, 3),
    };
}

export function closeBlockersReady(blockers: MonthCloseBlockers): boolean {
    return blockers.inboxCount === 0 && blockers.dueBillCount === 0;
}
