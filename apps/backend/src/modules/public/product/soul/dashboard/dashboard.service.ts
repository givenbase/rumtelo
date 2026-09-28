import { EnergyMetric } from '@rumtelo/contracts';
import { Inject, Injectable } from '@nestjs/common';

import { currentPeriod, currentWeek } from '../../../../../common/utils/period.util';
import { CoachService } from '../../../platform/coach/coach.service';
import { LogService } from '../../energy/log/log.service';
import { WeekCheckService as MoneyWeekCheckService } from '../../money/week-check/week-check.service';
import { GratitudeService } from '../gratitude/gratitude.service';

/**
 * Soul portal hub composition. Stillness streak uses energy MIND logs;
 * intention reuses the money week-check text when present (closest persisted intent).
 */
@Injectable()
export class SoulDashboardService {
    constructor(
        @Inject(GratitudeService) private readonly gratitude: GratitudeService,
        @Inject(LogService) private readonly energyLogs: LogService,
        @Inject(MoneyWeekCheckService) private readonly moneyWeekChecks: MoneyWeekCheckService,
        @Inject(CoachService) private readonly coach: CoachService
    ) {}

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    async get() {
        const week = currentWeek();
        const [thanks, logs, moneyWeekHistory, coach] = await Promise.all([
            this.gratitude.forWeek(week),
            this.energyLogs.logs(),
            this.moneyWeekChecks.history(),
            this.coach.feed(currentPeriod()),
        ]);

        const mindDays = new Set(
            logs.filter(log => log.metric === EnergyMetric.MIND).map(log => log.on)
        );
        const moneyWeekCheck = moneyWeekHistory.find(row => row.week === week);

        return {
            stillnessStreakDays: mindDays.size === 0 ? null : streakEndingToday(mindDays),
            gratitudeThisWeek: thanks.length,
            intention: moneyWeekCheck?.intention?.trim() ? moneyWeekCheck.intention : null,
            centersNamedToday: 0,
            coach,
        };
    }
}

/** Count consecutive UTC days with an entry, ending today (or 0 if today missing). */
function streakEndingToday(days: Set<string>): number {
    let streak = 0;
    const cursor = new Date();
    for (;;) {
        const key = cursor.toISOString().slice(0, 10);
        if (!days.has(key)) break;
        streak += 1;
        cursor.setUTCDate(cursor.getUTCDate() - 1);
    }
    return streak;
}
