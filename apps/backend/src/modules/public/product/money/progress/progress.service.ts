import { Inject, Injectable } from '@nestjs/common';

import { BoardStage, type MoneyProgress, isPaidPlan } from '@rumtelo/contracts';

import { currentHouseholdId } from '../../../../../common/household/household.context';
import { currentWeek } from '../../../../../common/utils/period.util';
import { HouseholdSettingsService } from '../../../../auth/household/household-settings/household-settings.service';
import { TransactionService } from '../ledger/transaction/transaction.service';
import { MonthScoreService } from '../month-score/month-score.service';
import { WeekCheckService } from '../week-check/week-check.service';
import {
    SORTING_THRESHOLD,
    boardStage,
    householdAgeInDays,
    nextBoardStep,
} from './board-stage.util';

/**
 * Board stage (SPLIT → SORTING → ROUTINE → MONTH) of the request's household, computed on
 * every read from the owning services' facts. No per-milestone rows are stored. One deliberate
 * exception to "no write-on-read": a paid household whose stage floor was never written gets it
 * raised to MONTH once (idempotent, only raises, keyed on the server-side plan). Facts are
 * "as of now" and never depend on period travel.
 *
 * The plan only enters through the paid floor (Plus / Max are at MONTH). The
 * person's "show everything" switch and the Practice preview are applied by the client.
 */
@Injectable()
export class ProgressService {
    constructor(
        @Inject(TransactionService) private readonly transactions: TransactionService,
        @Inject(WeekCheckService) private readonly weekChecks: WeekCheckService,
        @Inject(MonthScoreService) private readonly monthScores: MonthScoreService,
        @Inject(HouseholdSettingsService)
        private readonly householdSettings: HouseholdSettingsService
    ) {}

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    /** Board facts and the stage they reach, scoped to the request's household. */
    async get(now = new Date()): Promise<MoneyProgress> {
        const [hasTransactions, sortedCount, weekCheck, hasClosedMonth, settings] =
            await Promise.all([
                this.transactions.hasAny(),
                this.transactions.sortedCount(SORTING_THRESHOLD),
                this.weekChecks.completionFacts(currentWeek(now)),
                this.monthScores.hasClosedMonth(),
                this.householdSettings.get(currentHouseholdId()),
            ]);

        const facts = {
            hasClosedMonth,
            hasCompletedWeekCheck: weekCheck.hasCompleted,
            sortedCount,
            householdAgeDays: householdAgeInDays(new Date(settings.createdAt), now),
            planKey: settings.planKey,
            storedFloor: settings.boardStageFloor,
        };
        const stage = boardStage(facts);

        // Self-heal: a paid household whose floor was never written (a plan change path that
        // predates the write) gets it now, once, so a later downgrade keeps the full menu.
        if (isPaidPlan(settings.planKey) && settings.boardStageFloor !== BoardStage.MONTH) {
            await this.householdSettings.raiseBoardStageFloor(
                currentHouseholdId(),
                BoardStage.MONTH
            );
        }

        return {
            hasTransactions,
            hasCompletedWeekCheck: weekCheck.hasCompleted,
            weekCheckDoneThisWeek: weekCheck.doneThisWeek,
            hasClosedMonth,
            sortedCount,
            householdAgeDays: facts.householdAgeDays,
            stage,
            next: nextBoardStep(stage, facts),
        };
    }
}
