import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';
import {
    bandStatus,
    CAPABILITIES,
    CoachFeatureId,
    DISCRETIONARY_BAND,
    hasCapability,
    isCoachFeatureEnabledAtLaunch,
    TIME_COACH_KEY_PREFIX,
    TIME_REFERENCE,
    TimeBandStatus,
    TimeCategory,
    TimeDayKind,
    TimeKind,
    CoachKind,
} from '@rumtelo/contracts';

import { PlanAccessService } from '../../../../../common/capability';
import { isLaunchProductsDeferred } from '../../../../../common/config/launch-products.util';
import { HouseholdScopedRepository } from '../../../../../common/household/household-scoped.repository';
import { currentWeek } from '../../../../../common/utils/period.util';
import { AccountService } from '../../../../auth/user/account/account.service';
import { CoachService } from '../../../platform/coach/coach.service';
import type { CoachDraft } from '../../../platform/coach/coach.service';
import { TimeTemplate } from '../time-template/time-template.entity';
import { TimeEntry } from './time-entry.entity';
import { weekRange } from './time-week.util';
import {
    addDay,
    addDays,
    emptyDay,
    finalizeDay,
    formatCoachHours,
    isoWeekday,
    kindTotal,
    median,
    templateForWeekday,
    todayIso,
} from './time-coach.util';

const WEEK_HREF = '/product/energy/week';
const JETLAG_MINUTES = 2 * 60;
const DRIFT_MIN_DAYS = 10;
const DRIFT_GAP_MINUTES = 60;
const CATCH_UP_MIN_DAYS = 3;
const WORKDAY_MIN_PAID = 4 * 60;

/**
 * Turns the time diary and the two typical-day templates into coach lines.
 * Rule-based on purpose — the citations live in TIME_REFERENCE; a model
 * paraphrasing them would loosen the tone.
 */
@Injectable()
export class TimeCoachService implements OnModuleInit {
    private readonly entries: HouseholdScopedRepository<TimeEntry>;
    private readonly templates: HouseholdScopedRepository<TimeTemplate>;

    constructor(
        @Inject(EntityManager) em: EntityManager,
        @Inject(AccountService) private readonly accounts: AccountService,
        @Inject(CoachService) private readonly coach: CoachService,
        @Inject(PlanAccessService) private readonly planAccess: PlanAccessService
    ) {
        this.entries = new HouseholdScopedRepository(em, TimeEntry);
        this.templates = new HouseholdScopedRepository(em, TimeTemplate);
    }

    onModuleInit(): void {
        this.coach.registerRefresher(() => this.refresh());
    }

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    /** Evaluate the current person's week and upsert the inbox. */
    async refresh(): Promise<void> {
        if (isLaunchProductsDeferred()) return;
        if (
            !isCoachFeatureEnabledAtLaunch(CoachFeatureId.TIME_COACH, {
                nodeEnv: process.env.NODE_ENV,
            })
        ) {
            return;
        }
        const planKey = await this.planAccess.planKeyForCurrentHousehold();
        if (!hasCapability(CAPABILITIES.energyWeek, planKey)) return;

        const { account } = await this.accounts.ensureCurrentAccount();
        const drafts = await this.evaluate(account.id);
        await this.coach.sync(account.id, TIME_COACH_KEY_PREFIX, drafts);
    }

    // Private

    private async evaluate(accountId: string): Promise<CoachDraft[]> {
        const templates: TimeTemplate[] = await this.templates.find({ account: accountId });
        const week = currentWeek();
        const { from, to } = weekRange(week);
        const today = todayIso();
        const weekEntries: TimeEntry[] = await this.entries.find({
            account: accountId,
            loggedOn: { $gte: from, $lte: to },
        });

        const drafts: CoachDraft[] = [];

        if (templates.length === 0) {
            drafts.push({
                key: `${TIME_COACH_KEY_PREFIX}needs_setup`,
                kind: CoachKind.NUDGE,
                text: 'Three screens and logging a day becomes one tap. Set how your week mostly looks.',
                ctaLabel: 'Set up my typical week',
                ctaHref: WEEK_HREF,
            });
            return drafts;
        }

        const loggedDays = new Set(weekEntries.map(row => row.loggedOn));
        const missingPast = this.pastUnlogged(from, today, loggedDays);
        if (missingPast >= CATCH_UP_MIN_DAYS) {
            drafts.push({
                key: `${TIME_COACH_KEY_PREFIX}catch_up:${week}:${missingPast}`,
                kind: CoachKind.NUDGE,
                text: `${missingPast} days this week are not logged. Tap typical under each to catch up in one go.`,
                ctaLabel: 'Open my week',
                ctaHref: WEEK_HREF,
            });
        }

        const planned = this.planWeek(templates, weekEntries, from);
        const work = planned[TimeCategory.PAID_WORK];
        const workCeiling = TIME_REFERENCE[TimeCategory.PAID_WORK].band?.ceiling;
        if (workCeiling !== null && workCeiling !== undefined && work >= workCeiling) {
            drafts.push({
                key: `${TIME_COACH_KEY_PREFIX}work_ceiling:${week}:${work}`,
                kind: CoachKind.WARNING,
                text: `At your typical shape this week lands at ${formatCoachHours(work)} of work. Above 55h, WHO/ILO found +35% stroke risk.`,
                ctaLabel: 'See the week',
                ctaHref: WEEK_HREF,
            });
        }

        const moving = planned[TimeCategory.EXERCISE];
        const movingFloor = TIME_REFERENCE[TimeCategory.EXERCISE].band?.targetLow;
        if (movingFloor !== null && movingFloor !== undefined && moving < movingFloor) {
            drafts.push({
                key: `${TIME_COACH_KEY_PREFIX}exercise_floor:${week}:${moving}:${movingFloor}`,
                kind: CoachKind.INSIGHT,
                text: `Your typical week has ${formatCoachHours(moving)} of movement in it. WHO’s floor is ${formatCoachHours(movingFloor)}.`,
                ctaLabel: 'Open my week',
                ctaHref: WEEK_HREF,
            });
        }

        const free = kindTotal(planned, TimeKind.FREE);
        const freeDaily = Math.round(free / 7);
        const namedFree = free - planned[TimeCategory.FREE_OTHER];
        if (
            DISCRETIONARY_BAND.targetHigh !== null &&
            freeDaily > DISCRETIONARY_BAND.targetHigh / 7 &&
            namedFree === 0
        ) {
            drafts.push({
                key: `${TIME_COACH_KEY_PREFIX}free_unsplit:${week}:${freeDaily}`,
                kind: CoachKind.NUDGE,
                text: `${formatCoachHours(freeDaily)} a day you steer, none of it named. Worth splitting once — the sweet spot only holds when it is social or purposeful.`,
                ctaLabel: 'Change my typical week',
                ctaHref: WEEK_HREF,
            });
        }

        const workday = templates.find(row => row.kind === TimeDayKind.WORKDAY);
        const dayOff = templates.find(row => row.kind === TimeDayKind.DAY_OFF);
        const workSleep = workday?.minutes[TimeCategory.SLEEP] ?? 0;
        const offSleep = dayOff?.minutes[TimeCategory.SLEEP] ?? 0;
        const jetlag = offSleep - workSleep;
        if (jetlag > JETLAG_MINUTES) {
            drafts.push({
                key: `${TIME_COACH_KEY_PREFIX}social_jetlag:${jetlag}`,
                kind: CoachKind.INSIGHT,
                text: `You sleep in ${formatCoachHours(jetlag)} on days off. That gap is social jetlag — it tracks with mood and metabolic outcomes on its own.`,
                ctaLabel: 'Open my week',
                ctaHref: WEEK_HREF,
            });
        }

        const drift = await this.workDrift(accountId, workday);
        if (drift) drafts.push(drift);

        if (loggedDays.size === 7) {
            const win = this.fullWeekWin(week, planned, loggedDays.size);
            if (win) drafts.push(win);
        }

        return drafts;
    }

    private planWeek(
        templates: TimeTemplate[],
        entries: TimeEntry[],
        from: string
    ): Record<TimeCategory, number> {
        const totals = emptyDay();
        for (let offset = 0; offset < 7; offset++) {
            const iso = addDays(from, offset);
            const rows = entries.filter(entry => entry.loggedOn === iso);
            if (rows.length > 0) {
                const day = emptyDay();
                for (const row of rows) day[row.category] += row.minutes;
                addDay(totals, day);
                continue;
            }
            const shape = templateForWeekday(templates, isoWeekday(iso));
            addDay(totals, finalizeDay(shape ?? {}));
        }
        return totals;
    }

    private pastUnlogged(from: string, today: string, logged: Set<string>): number {
        let missing = 0;
        for (let offset = 0; offset < 7; offset++) {
            const iso = addDays(from, offset);
            if (iso >= today) break;
            if (!logged.has(iso)) missing += 1;
        }
        return missing;
    }

    private async workDrift(
        accountId: string,
        workday: TimeTemplate | undefined
    ): Promise<CoachDraft | null> {
        if (!workday) return null;
        const stated = workday.minutes[TimeCategory.PAID_WORK] ?? 0;
        const since = addDays(todayIso(), -28);
        const history: TimeEntry[] = await this.entries.find({
            account: accountId,
            category: TimeCategory.PAID_WORK,
            loggedOn: { $gte: since },
        });
        const weekdays = new Set(workday.weekdays);
        const byDay = new Map<string, number>();
        for (const row of history) {
            if (!weekdays.has(isoWeekday(row.loggedOn))) continue;
            byDay.set(row.loggedOn, (byDay.get(row.loggedOn) ?? 0) + row.minutes);
        }
        const days = [...byDay.entries()]
            .filter(([, minutes]) => minutes >= WORKDAY_MIN_PAID)
            .sort(([left], [right]) => right.localeCompare(left))
            .slice(0, DRIFT_MIN_DAYS);
        if (days.length < DRIFT_MIN_DAYS) return null;
        const typical = median(days.map(([, minutes]) => minutes));
        if (typical < stated + DRIFT_GAP_MINUTES) return null;
        return {
            key: `${TIME_COACH_KEY_PREFIX}work_drift:${stated}:${typical}:${days.length}`,
            kind: CoachKind.INSIGHT,
            text: `You set ${formatCoachHours(stated)} of work; your last ${days.length} workdays median ${formatCoachHours(typical)}.`,
            ctaLabel: 'Open my week',
            ctaHref: WEEK_HREF,
        };
    }

    private fullWeekWin(
        week: string,
        totals: Record<TimeCategory, number>,
        daysLogged: number
    ): CoachDraft | null {
        for (const category of Object.values(TimeCategory)) {
            const band = TIME_REFERENCE[category].band;
            if (!band) continue;
            if (bandStatus(totals[category], band, daysLogged) !== TimeBandStatus.ON_TARGET) {
                return null;
            }
        }
        const free = kindTotal(totals, TimeKind.FREE);
        if (bandStatus(free, DISCRETIONARY_BAND, daysLogged) !== TimeBandStatus.ON_TARGET) {
            return null;
        }
        return {
            key: `${TIME_COACH_KEY_PREFIX}week_in_range:${week}`,
            kind: CoachKind.WIN,
            text: '168 hours, every band in range. Rare.',
            ctaLabel: 'See the week',
            ctaHref: WEEK_HREF,
        };
    }
}
