/**
 * Restore a Rumtelo JSON household export into the current household.
 * Remaps jars by JarKey; skips plan-gated / duplicate rows; dry-run by default.
 */

import { createHash } from 'node:crypto';

import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';

import {
    CAPABILITIES,
    GoalStatus,
    TransactionSource,
    TransactionStatus,
    hasCapability,
    type ArchiveRestorePayload,
    type ArchiveRestoreResult,
    type ArchiveSectionCounts,
    type JarKey,
} from '@rumtelo/contracts';

import { PlanAccessService } from '../../../../../common/capability';
import { currentHouseholdId } from '../../../../../common/household/household.context';
import { HouseholdScopedRepository } from '../../../../../common/household/household-scoped.repository';
import { DebtService } from '../targets/debt/debt.service';
import { GoalService } from '../targets/goal/goal.service';
import { FixedCostService } from '../plan/fixed-cost/fixed-cost.service';
import { IncomeService } from '../plan/income/income.service';
import { Jar } from '../plan/jar/jar.entity';
import { JarService } from '../plan/jar/jar.service';
import { SortRuleService } from '../ledger/sort-rule/sort-rule.service';
import { Transaction } from '../ledger/transaction/transaction.entity';

const emptySection = (): ArchiveSectionCounts => ({
    willImport: 0,
    skipped: 0,
    skippedPlan: 0,
});

@Injectable()
export class ArchiveService {
    private readonly transactions: HouseholdScopedRepository<Transaction>;

    constructor(
        @Inject(EntityManager) private readonly em: EntityManager,
        @Inject(PlanAccessService) private readonly planAccess: PlanAccessService,
        @Inject(JarService) private readonly jars: JarService,
        @Inject(IncomeService) private readonly income: IncomeService,
        @Inject(FixedCostService) private readonly fixedCosts: FixedCostService,
        @Inject(DebtService) private readonly debts: DebtService,
        @Inject(GoalService) private readonly goals: GoalService,
        @Inject(SortRuleService) private readonly rules: SortRuleService
    ) {
        this.transactions = new HouseholdScopedRepository(em, Transaction);
    }

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    async restore(input: {
        payload: ArchiveRestorePayload;
        dryRun: boolean;
        applyJarSplit: boolean;
    }): Promise<ArchiveRestoreResult> {
        const { payload, dryRun, applyJarSplit } = input;
        const warnings: string[] = [];
        const sample: string[] = [];
        const planKey = await this.planAccess.planKeyForCurrentHousehold();
        const canDebt = hasCapability(CAPABILITIES.moneyDebt, planKey);
        const canGoals = hasCapability(CAPABILITIES.growthGoals, planKey);

        const localJars = await this.jars.list();
        const localKeyToId = new Map(localJars.map(jar => [jar.key, jar.id]));
        const exportIdToKey = new Map<string, JarKey>();
        for (const jar of payload.jars) {
            if (jar.id) exportIdToKey.set(jar.id, jar.key);
        }

        const remapJarId = (exportJarId: string | null | undefined): string | null => {
            if (!exportJarId) return null;
            const key = exportIdToKey.get(exportJarId);
            if (!key) return null;
            return localKeyToId.get(key) ?? null;
        };

        let jarsSplitUpdated = false;
        if (applyJarSplit && payload.jars.length > 0) {
            const total = payload.jars.reduce((sum, jar) => sum + jar.percentage, 0);
            if (Math.abs(total - 100) <= 0.01) {
                const split = payload.jars
                    .map(jar => {
                        const jarId = localKeyToId.get(jar.key);
                        return jarId ? { jarId, percentage: jar.percentage } : null;
                    })
                    .filter((row): row is { jarId: string; percentage: number } => row !== null);
                if (split.length === localJars.length) {
                    if (!dryRun) await this.jars.updateSplit(split);
                    jarsSplitUpdated = true;
                } else {
                    warnings.push('jar_split_incomplete');
                }
            } else {
                warnings.push('jar_split_not_100');
            }
        }

        const incomeCounts = emptySection();
        const existingIncome = await this.income.list();
        const incomeNames = new Set(existingIncome.map(row => row.name.toLowerCase()));
        for (const row of payload.income) {
            if (incomeNames.has(row.name.toLowerCase())) {
                incomeCounts.skipped += 1;
                continue;
            }
            incomeCounts.willImport += 1;
            incomeNames.add(row.name.toLowerCase());
            if (!dryRun) {
                await this.income.create({
                    name: row.name,
                    presetKey: row.presetKey ?? null,
                    counterparty: row.counterparty ?? null,
                    merchantKey: row.merchantKey ?? null,
                    // Relink by name when the export marked a saved party.
                    saveParty: Boolean(row.partyName?.trim()),
                    kind: row.kind,
                    amount: row.amount,
                    cadence: row.cadence,
                    expectedDay: row.expectedDay ?? null,
                    isActive: row.isActive,
                    startedOn: row.startedOn ?? null,
                    endsOn: row.endsOn ?? null,
                });
            }
        }

        const debtCounts = emptySection();
        const debtIdMap = new Map<string, string>();
        if (!canDebt && payload.debts.length > 0) {
            debtCounts.skippedPlan = payload.debts.length;
            warnings.push('debts_skipped_plan');
        } else {
            const existingDebts = canDebt ? await this.debts.list() : [];
            const debtNames = new Set(existingDebts.map(row => row.name.toLowerCase()));
            for (const row of payload.debts) {
                if (debtNames.has(row.name.toLowerCase())) {
                    debtCounts.skipped += 1;
                    const match = existingDebts.find(
                        debt => debt.name.toLowerCase() === row.name.toLowerCase()
                    );
                    if (row.id && match) debtIdMap.set(row.id, match.id);
                    continue;
                }
                debtCounts.willImport += 1;
                debtNames.add(row.name.toLowerCase());
                if (!dryRun) {
                    const created = await this.debts.create({
                        name: row.name,
                        presetKey: row.presetKey ?? null,
                        kind: row.kind,
                        balance: row.balance,
                        originalBalance: row.originalBalance,
                        interestRate: row.interestRate,
                        minimumPayment: row.minimumPayment,
                        extraPayment: row.extraPayment,
                        dueDay: row.dueDay ?? null,
                        dueMonth: row.dueMonth ?? null,
                        closedOn: row.closedOn ?? null,
                        startedOn: row.startedOn ?? null,
                        scheduleKind: row.scheduleKind,
                        paymentCadence: row.paymentCadence,
                        termPayments: row.termPayments ?? null,
                        maturityOn: row.maturityOn ?? null,
                        linkFixedCost: false,
                    });
                    if (row.id) debtIdMap.set(row.id, created.id);
                    existingDebts.push(created);
                }
            }
        }

        const fixedCounts = emptySection();
        const existingFixed = await this.fixedCosts.list();
        const fixedKeys = new Set(
            existingFixed.map(row => `${row.name.toLowerCase()}|${row.amount}|${row.jarId}`)
        );
        for (const row of payload.fixedCosts) {
            const jarId = remapJarId(row.jarId);
            if (!jarId) {
                fixedCounts.skipped += 1;
                warnings.push('fixed_cost_jar_unmapped');
                continue;
            }
            const key = `${row.name.toLowerCase()}|${row.amount}|${jarId}`;
            if (fixedKeys.has(key)) {
                fixedCounts.skipped += 1;
                continue;
            }
            fixedCounts.willImport += 1;
            fixedKeys.add(key);
            if (!dryRun) {
                await this.fixedCosts.create({
                    jarId,
                    name: row.name,
                    presetKey: row.presetKey ?? null,
                    amount: row.amount,
                    cadence: row.cadence,
                    direction: row.direction,
                    debtId: row.debtId ? (debtIdMap.get(row.debtId) ?? null) : null,
                    counterparty: row.counterparty ?? null,
                    dueDay: row.dueDay ?? null,
                    dueMonth: row.dueMonth ?? null,
                    isActive: row.isActive,
                    startedOn: row.startedOn ?? null,
                    endsOn: row.endsOn ?? null,
                    note: row.note ?? null,
                });
            }
        }

        const goalCounts = emptySection();
        if (!canGoals && payload.goals.length > 0) {
            goalCounts.skippedPlan = payload.goals.length;
            warnings.push('goals_skipped_plan');
        } else {
            const existingGoals = canGoals ? await this.goals.list() : [];
            const goalNames = new Set(existingGoals.map(row => row.name.toLowerCase()));
            let occupied = existingGoals.filter(row => row.status === GoalStatus.ACTIVE).length;
            for (const row of payload.goals) {
                if (goalNames.has(row.name.toLowerCase())) {
                    goalCounts.skipped += 1;
                    continue;
                }
                try {
                    await this.planAccess.assertWithinLimit('maxGoals', occupied);
                } catch {
                    goalCounts.skippedPlan += 1;
                    warnings.push('goals_limit_reached');
                    continue;
                }
                goalCounts.willImport += 1;
                goalNames.add(row.name.toLowerCase());
                occupied += 1;
                if (!dryRun) {
                    await this.goals.create({
                        kind: row.kind,
                        jarId: remapJarId(row.jarId ?? null),
                        name: row.name,
                        icon: row.icon ?? null,
                        target: row.target,
                        monthlyContribution: row.monthlyContribution,
                        targetOn: row.targetOn ?? null,
                        status: row.status,
                        why: row.why ?? null,
                    });
                }
            }
        }

        const ruleCounts = emptySection();
        const existingRules = await this.rules.list();
        const ruleKeys = new Set(
            existingRules.map(
                row => `${row.field}|${row.matcher}|${row.matchValue.toLowerCase()}|${row.jarId}`
            )
        );
        for (const row of payload.rules) {
            const jarId = remapJarId(row.jarId);
            if (!jarId) {
                ruleCounts.skipped += 1;
                continue;
            }
            const key = `${row.field}|${row.matcher}|${row.matchValue.toLowerCase()}|${jarId}`;
            if (ruleKeys.has(key)) {
                ruleCounts.skipped += 1;
                continue;
            }
            ruleCounts.willImport += 1;
            ruleKeys.add(key);
            if (!dryRun) {
                await this.rules.create({
                    field: row.field,
                    matcher: row.matcher,
                    matchValue: row.matchValue,
                    jarId,
                    categoryId: null,
                    priority: row.priority,
                    isActive: row.isActive,
                });
            }
        }

        const txCounts = emptySection();
        const incomingKeys: string[] = [];
        const prepared: Array<{
            bookedOn: string;
            amount: number;
            description: string;
            counterparty: string | null;
            jarId: string | null;
            note: string | null;
            dedupeKey: string;
        }> = [];
        for (const row of payload.transactions) {
            const key = archiveDedupeKey(row.bookedOn, row.amount, row.description);
            incomingKeys.push(key);
            prepared.push({
                bookedOn: row.bookedOn,
                amount: row.amount,
                description: row.description,
                counterparty: row.counterparty ?? null,
                jarId: remapJarId(row.jarId ?? null),
                note: row.note ?? null,
                dedupeKey: key,
            });
        }
        const existingTx = incomingKeys.length
            ? await this.transactions.find({ dedupeKey: { $in: incomingKeys } })
            : [];
        const seen = new Set(existingTx.map(row => row.dedupeKey));
        for (const row of prepared) {
            if (seen.has(row.dedupeKey)) {
                txCounts.skipped += 1;
                continue;
            }
            seen.add(row.dedupeKey);
            txCounts.willImport += 1;
            if (sample.length < 5) {
                sample.push(row.counterparty?.trim() || row.description);
            }
            if (!dryRun) {
                const entity = this.em.create(Transaction, {
                    household: currentHouseholdId(),
                    account: null,
                    jar: row.jarId ? this.em.getReference(Jar, row.jarId) : null,
                    category: null,
                    debt: null,
                    fixedCost: null,
                    amount: row.amount,
                    bookedOn: row.bookedOn,
                    description: row.description,
                    counterparty: row.counterparty,
                    inflowKey: null,
                    note: row.note,
                    status: row.jarId ? TransactionStatus.SORTED : TransactionStatus.INBOX,
                    source: TransactionSource.CSV,
                    dedupeKey: row.dedupeKey,
                    appliedRule: null,
                    appliedMerchantKey: null,
                } as never);
                this.em.persist(entity);
            }
        }
        if (!dryRun && txCounts.willImport > 0) {
            await this.em.flush();
        }

        return {
            dryRun,
            jarsSplitUpdated,
            income: incomeCounts,
            fixedCosts: fixedCounts,
            debts: debtCounts,
            goals: goalCounts,
            rules: ruleCounts,
            transactions: txCounts,
            warnings: [...new Set(warnings)],
            sample,
        };
    }
}

function archiveDedupeKey(bookedOn: string, amount: number, description: string) {
    return createHash('sha256')
        .update(['archive', bookedOn, String(amount), description.trim().toLowerCase()].join('|'))
        .digest('hex')
        .slice(0, 64);
}
