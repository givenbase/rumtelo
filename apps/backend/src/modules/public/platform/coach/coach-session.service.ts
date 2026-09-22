import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';
import {
    COACH_SESSION_STEP_CAP,
    CoachKind,
    coachStepVoice,
    EnergyMetric,
    TimeDayKind,
    TransactionStatus,
    WeekCheckStage,
} from '@rumtelo/contracts';
import type { CoachSession, CoachStep } from '@rumtelo/contracts';
import { fixedCostPeriodStatus } from '@rumtelo/utils';

import { currentHouseholdId } from '../../../../common/household/household.context';
import { HouseholdScopedRepository } from '../../../../common/household/household-scoped.repository';
import { currentPeriod, currentWeek } from '../../../../common/utils/period.util';
import { AccountService } from '../../../auth/user/account/account.service';
import { EnergyLog } from '../../product/energy/log/energy-log.entity';
import { TimeEntry } from '../../product/energy/time/time-entry.entity';
import { weekRange } from '../../product/energy/time/time-week.util';
import { TimeTemplate } from '../../product/energy/time-template/time-template.entity';
import { Transaction } from '../../product/money/ledger/transaction/transaction.entity';
import { FixedCost } from '../../product/money/plan/fixed-cost/fixed-cost.entity';
import { FixedCostSettlement } from '../../product/money/plan/fixed-cost/fixed-cost-settlement.entity';
import { Jar } from '../../product/money/plan/jar/jar.entity';
import { MoneyWeekCheck } from '../../product/money/week-check/money-week-check.entity';
import { Gratitude } from '../../product/soul/gratitude/gratitude.entity';

const WEEKDAY_NAMES = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
];
const CATCH_UP_MIN = 3;

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
    private readonly templates: HouseholdScopedRepository<TimeTemplate>;
    private readonly timeEntries: HouseholdScopedRepository<TimeEntry>;
    private readonly gratitude: HouseholdScopedRepository<Gratitude>;
    private readonly energyLogs: HouseholdScopedRepository<EnergyLog>;

    constructor(
        @Inject(EntityManager) private readonly em: EntityManager,
        @Inject(AccountService) private readonly accounts: AccountService
    ) {
        this.transactions = new HouseholdScopedRepository(em, Transaction);
        this.jars = new HouseholdScopedRepository(em, Jar);
        this.fixedCosts = new HouseholdScopedRepository(em, FixedCost);
        this.settlements = new HouseholdScopedRepository(em, FixedCostSettlement);
        this.weekChecks = new HouseholdScopedRepository(em, MoneyWeekCheck);
        this.templates = new HouseholdScopedRepository(em, TimeTemplate);
        this.timeEntries = new HouseholdScopedRepository(em, TimeEntry);
        this.gratitude = new HouseholdScopedRepository(em, Gratitude);
        this.energyLogs = new HouseholdScopedRepository(em, EnergyLog);
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    async session(): Promise<CoachSession> {
        const period = currentPeriod();
        const week = currentWeek();
        const { account } = await this.accounts.ensureCurrentAccount();
        const householdId = currentHouseholdId();

        const steps: CoachStep[] = [];
        await this.pushInbox(steps);
        await this.pushDueBills(steps, period);
        await this.pushWeekCheck(steps, week);
        await this.pushTime(steps, account.id, week);
        await this.pushGratitude(steps, account.id, week);
        await this.pushEnergyScore(steps, account.id);

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

        for (const cost of costs) {
            const settlement = byCost.get(cost.id);
            const status = fixedCostPeriodStatus(
                { isActive: cost.isActive, dueDay: cost.dueDay },
                settlement ? { status: settlement.status } : null,
                period
            );
            if (status !== 'due') continue;

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

    private async pushTime(steps: CoachStep[], accountId: string, week: string): Promise<void> {
        const templates: TimeTemplate[] = await this.templates.find({ account: accountId });
        if (templates.length === 0) {
            this.enqueue(steps, {
                id: 'energy.time.needs_setup',
                portal: 'energy',
                kind: CoachKind.NUDGE,
                prompt: 'Three screens and logging a day becomes one tap. Set how your week mostly looks.',
                input: 'link_only',
                payload: { type: 'link', href: '/product/energy/week' },
                href: '/product/energy/week',
                hrefLabel: 'Set up my typical week',
            });
            return;
        }

        const { from, to } = weekRange(week);
        const entries: TimeEntry[] = await this.timeEntries.find({
            account: accountId,
            loggedOn: { $gte: from, $lte: to },
        });
        const logged = new Set(entries.map(row => row.loggedOn));
        const today = new Date().toISOString().slice(0, 10);

        const missingPast: { on: string; dayLabel: string }[] = [];
        for (let offset = 0; offset < 7; offset++) {
            const on = addDays(from, offset);
            if (on >= today) break;
            if (!logged.has(on)) {
                missingPast.push({ on, dayLabel: dayLabel(on) });
            }
        }

        if (missingPast.length >= CATCH_UP_MIN) {
            this.enqueue(steps, {
                id: `energy.time.catch_up:${week}`,
                portal: 'energy',
                kind: CoachKind.NUDGE,
                prompt: `${missingPast.length} days this week are not logged. Log them as typical in one go?`,
                input: 'yes_typical',
                payload: {
                    type: 'time_catch_up',
                    days: missingPast,
                    count: missingPast.length,
                },
                href: '/product/energy/week',
                hrefLabel: 'Open my week',
            });
            return;
        }

        const checkDay = today >= from && today <= to ? today : null;
        if (checkDay && !logged.has(checkDay)) {
            const weekday = isoWeekday(checkDay);
            const template = templates.find(row => row.weekdays.includes(weekday)) ?? templates[0]!;
            const kindLabel = template.kind === TimeDayKind.WORKDAY ? 'workday' : 'day off';
            this.enqueue(steps, {
                id: `energy.time.check_in:${checkDay}`,
                portal: 'energy',
                kind: CoachKind.NUDGE,
                prompt: `Was ${dayLabel(checkDay)} a typical ${kindLabel}?`,
                input: 'yes_typical',
                payload: {
                    type: 'time_day',
                    on: checkDay,
                    dayLabel: dayLabel(checkDay),
                    kindLabel,
                },
                href: '/product/energy/week',
                hrefLabel: 'Adjust on My week',
            });
        }
    }

    private async pushGratitude(
        steps: CoachStep[],
        accountId: string,
        week: string
    ): Promise<void> {
        const rows = await this.gratitude.find({ account: accountId, week }, { limit: 1 });
        if (rows.length > 0) return;

        this.enqueue(steps, {
            id: `soul.gratitude:${week}`,
            portal: 'soul',
            kind: CoachKind.NUDGE,
            prompt: 'What are you grateful for this week? One line is enough.',
            input: 'gratitude_text',
            payload: { type: 'gratitude', week },
            href: '/product/soul/gratitude',
            hrefLabel: 'Open gratitude',
        });
    }

    private async pushEnergyScore(steps: CoachStep[], accountId: string): Promise<void> {
        const today = new Date().toISOString().slice(0, 10);
        const metrics: { metric: EnergyMetric; prompt: string }[] = [
            {
                metric: EnergyMetric.SLEEP,
                prompt: 'How rested do you feel today? (quality, not hours.)',
            },
            { metric: EnergyMetric.FOOD, prompt: 'How well did you fuel today?' },
            { metric: EnergyMetric.TRAIN, prompt: 'Did you train today? How was the session?' },
            { metric: EnergyMetric.MIND, prompt: 'Stillness today — how settled do you feel?' },
        ];

        const existing = await this.energyLogs.find({
            account: accountId,
            loggedOn: today,
            metric: { $in: metrics.map(row => row.metric) },
        });
        const logged = new Set(existing.map(row => row.metric));
        const candidate = metrics.find(row => !logged.has(row.metric));
        if (!candidate) return;

        this.enqueue(steps, {
            id: `energy.score.${candidate.metric}:${today}`,
            portal: 'energy',
            kind: CoachKind.NUDGE,
            prompt: candidate.prompt,
            input: 'score_chips',
            payload: { type: 'energy_score', metric: candidate.metric, on: today },
            href: null,
            hrefLabel: null,
        });
    }
}

function formatEuro(cents: number): string {
    const sign = cents < 0 ? '−' : '';
    const abs = Math.abs(cents);
    const euros = (abs / 100).toFixed(abs % 100 === 0 ? 0 : 2);
    return `${sign}€${euros}`;
}

function isoWeekday(iso: string): number {
    const [year, month, day] = iso.split('-').map(Number) as [number, number, number];
    return new Date(Date.UTC(year, month - 1, day)).getUTCDay() || 7;
}

function addDays(iso: string, delta: number): string {
    const [year, month, day] = iso.split('-').map(Number) as [number, number, number];
    const date = new Date(Date.UTC(year, month - 1, day));
    date.setUTCDate(date.getUTCDate() + delta);
    return date.toISOString().slice(0, 10);
}

function dayLabel(iso: string): string {
    return WEEKDAY_NAMES[isoWeekday(iso) - 1] ?? iso;
}
