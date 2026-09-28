import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';
import {
    COACH_SESSION_STEP_CAP,
    CoachKind,
    coachStepVoice,
    FixedCostPeriodStatus,
    TransactionStatus,
    WeekCheckStage,
} from '@rumtelo/contracts';
import type { CoachSession, CoachStep } from '@rumtelo/contracts';
import { fixedCostAppliesAsOf, fixedCostPeriodStatus, endOfPeriodIso } from '@rumtelo/utils';

import { currentHouseholdId } from '../../../../common/household/household.context';
import { HouseholdScopedRepository } from '../../../../common/household/household-scoped.repository';
import { currentPeriod, currentWeek } from '../../../../common/utils/period.util';
import { AccountService } from '../../../auth/user/account/account.service';
import { Transaction } from '../../product/money/ledger/transaction/transaction.entity';
import { FixedCost } from '../../product/money/plan/fixed-cost/fixed-cost.entity';
import { FixedCostSettlement } from '../../product/money/plan/fixed-cost/fixed-cost-settlement.entity';
import { Jar } from '../../product/money/plan/jar/jar.entity';
import { MoneyWeekCheck } from '../../product/money/week-check/money-week-check.entity';

/**
 * Builds the Coach fill queue from live household data.
 * Writes stay on product APIs — this service only decides what to ask.
 */
@Injectable()
export class CoachSessionService {
    private readonly transactions: HouseholdScopedRepository<Transaction>;
    private readonly jars: HouseholdScopedRepository<Jar>;
    private readonly fixedCosts: HouseholdScopedRepository<FixedCost>;
    private readonly settlements: HouseholdScopedRepository<FixedCostSettlement>;
    private readonly weekChecks: HouseholdScopedRepository<MoneyWeekCheck>;

    constructor(
        @Inject(EntityManager) private readonly em: EntityManager,
        @Inject(AccountService) private readonly accounts: AccountService
    ) {
        this.transactions = new HouseholdScopedRepository(em, Transaction);
        this.jars = new HouseholdScopedRepository(em, Jar);
        this.fixedCosts = new HouseholdScopedRepository(em, FixedCost);
        this.settlements = new HouseholdScopedRepository(em, FixedCostSettlement);
        this.weekChecks = new HouseholdScopedRepository(em, MoneyWeekCheck);
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    async session(periodKey?: string | null): Promise<CoachSession> {
        const period = periodKey ?? currentPeriod();
        const week = currentWeek();
        await this.accounts.ensureCurrentAccount();
        const householdId = currentHouseholdId();
        const livePeriod = currentPeriod();

        const steps: CoachStep[] = [];
        const viewingLive = period === livePeriod;
        // Inbox + week fills are live-month only; due bills follow the viewed period.
        // Energy / Soul coach producers stay off until those entities return to MikroORM.
        if (viewingLive) {
            await this.pushInbox(steps);
        }
        await this.pushDueBills(steps, period);
        if (viewingLive) {
            await this.pushWeekCheck(steps, week);
        }

        const totalAvailable = steps.length;
        const capped = steps.slice(0, COACH_SESSION_STEP_CAP);

        return {
            householdId,
            period,
            week,
            steps: capped,
            totalAvailable,
            quiet: totalAvailable === 0,
        };
    }

    // Private

    /** Attach contract voice flags from `input` — producers never invent browser capability. */
    private enqueue(steps: CoachStep[], step: Omit<CoachStep, 'voice'>): void {
        steps.push({ ...step, voice: coachStepVoice(step.input) });
    }

    private async pushInbox(steps: CoachStep[]): Promise<void> {
        const [inbox, jars] = await Promise.all([
            this.transactions.find(
                { status: TransactionStatus.INBOX },
                { orderBy: { bookedOn: 'DESC' }, limit: 1 }
            ),
            this.jars.find({}, { orderBy: { sortOrder: 'ASC' } }),
        ]);
        const tx = inbox[0];
        if (!tx || jars.length === 0) return;

        const amountLabel = formatEuro(tx.amount);
        const who = tx.counterparty?.trim() || tx.description.trim() || 'this transaction';

        this.enqueue(steps, {
            id: `money.inbox:${tx.id}`,
            portal: 'money',
            kind: CoachKind.NUDGE,
            prompt: `Which jar for ${who} (${amountLabel})?`,
            input: 'jar_pick',
            payload: {
                type: 'inbox_sort',
                transactionId: tx.id,
                amount: tx.amount,
                description: tx.description,
                counterparty: tx.counterparty,
                bookedOn: tx.bookedOn,
                jars: jars.map(jar => ({ id: jar.id, name: jar.name, key: jar.key })),
            },
            href: '/product/money/transactions?return=/product/coach',
            hrefLabel: 'Sort the rest',
        });
    }

    private async pushDueBills(steps: CoachStep[], period: string): Promise<void> {
        const [costs, settlements] = await Promise.all([
            this.fixedCosts.find({ isActive: true }),
            this.settlements.find({ period }),
        ]);
        const byCost = new Map(
            settlements.map(row => {
                const costId = typeof row.fixedCost === 'string' ? row.fixedCost : row.fixedCost.id;
                return [costId, row] as const;
            })
        );
        const asOf = endOfPeriodIso(period);

        for (const cost of costs) {
            if (!fixedCostAppliesAsOf(cost, asOf)) continue;
            const settlement = byCost.get(cost.id);
            const status = fixedCostPeriodStatus(
                { isActive: cost.isActive, dueDay: cost.dueDay },
                settlement ? { status: settlement.status } : null,
                period
            );
            if (status !== FixedCostPeriodStatus.DUE) continue;

            this.enqueue(steps, {
                id: `money.due_bill:${cost.id}:${period}`,
                portal: 'money',
                kind: CoachKind.NUDGE,
                prompt: `Was ${cost.name} (${formatEuro(cost.amount)}) paid this month, or should we skip it?`,
                input: 'paid_skip',
                payload: {
                    type: 'due_bill',
                    fixedCostId: cost.id,
                    name: cost.name,
                    amount: cost.amount,
                    period,
                },
                href: `/product/money/fixed-costs/${cost.id}`,
                hrefLabel: 'Open bill',
            });
            break; // one bill per visit
        }
    }

    private async pushWeekCheck(steps: CoachStep[], week: string): Promise<void> {
        const check = await this.weekChecks.findOne({ week });
        if (check?.completedAt || check?.stage === WeekCheckStage.DONE) return;

        const stage = check?.stage ?? WeekCheckStage.LOOK;
        const jars = await this.jars.find({}, { orderBy: { sortOrder: 'ASC' } });

        if (stage === WeekCheckStage.LOOK) {
            this.enqueue(steps, {
                id: `money.week_check.look:${week}`,
                portal: 'money',
                kind: CoachKind.WEEK_CHECK,
                prompt: 'Ten minutes for this week’s money check — look at the jars first.',
                input: 'week_check_look',
                payload: { type: 'week_check_look', week, stage },
                href: '/product/money/week-check',
                hrefLabel: 'Open full check',
            });
            return;
        }

        if (stage === WeekCheckStage.REDIRECT) {
            this.enqueue(steps, {
                id: `money.week_check.redirect:${week}`,
                portal: 'money',
                kind: CoachKind.WEEK_CHECK,
                prompt:
                    check && check.surplus > 0
                        ? `You have ${formatEuro(check.surplus)} left this week. Redirect any of it?`
                        : 'No surplus to redirect — continue to your intention.',
                input: 'week_check_redirect',
                payload: {
                    type: 'week_check_redirect',
                    week,
                    surplus: check?.surplus ?? 0,
                    jars: jars.map(jar => ({ id: jar.id, name: jar.name, key: jar.key })),
                },
                href: '/product/money/week-check',
                hrefLabel: 'Open full check',
            });
            return;
        }

        if (stage === WeekCheckStage.INTEND) {
            this.enqueue(steps, {
                id: `money.week_check.intend:${week}`,
                portal: 'money',
                kind: CoachKind.WEEK_CHECK,
                prompt: 'One sentence for this week — small enough to keep.',
                input: 'week_check_intend',
                payload: { type: 'week_check_intend', week },
                href: '/product/money/week-check',
                hrefLabel: 'Open full check',
            });
        }
    }
}

function formatEuro(cents: number): string {
    const sign = cents < 0 ? '−' : '';
    const abs = Math.abs(cents);
    const euros = (abs / 100).toFixed(abs % 100 === 0 ? 0 : 2);
    return `${sign}€${euros}`;
}
