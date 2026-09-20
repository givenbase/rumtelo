import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
    bandStatus,
    CAPABILITIES,
    DISCRETIONARY_BAND,
    MINUTES_PER_DAY,
    TIME_CATEGORY_KIND,
    TIME_REFERENCE,
    TimeCategory,
    TimeKind,
} from '@rumtelo/contracts';
import type { TimeEntry as TimeEntryDto, TimeWeekSummary } from '@rumtelo/contracts';

import { PlanAccessService } from '../../../../../common/capability';
import { HouseholdScopedRepository } from '../../../../../common/household/household-scoped.repository';
import { currentHouseholdId } from '../../../../../common/household/household.context';
import { currentWeek } from '../../../../../common/utils/period.util';
import { AccountService } from '../../../../auth/user/account/account.service';

import { TimeEntry } from './time-entry.entity';
import { weekRange } from './time-week.util';

@Injectable()
export class TimeService {
    private readonly repo: HouseholdScopedRepository<TimeEntry>;
    constructor(
        @Inject(EntityManager) private readonly em: EntityManager,
        @Inject(PlanAccessService) private readonly planAccess: PlanAccessService,
        @Inject(AccountService) private readonly accounts: AccountService
    ) {
        this.repo = new HouseholdScopedRepository(em, TimeEntry);
    }

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    /** Upsert one day for the current person. Untouched categories keep their rows. */
    async create(input: {
        householdId: string;
        on: string;
        entries: ReadonlyArray<{
            category: keyof typeof TimeCategory;
            minutes: number;
            note?: string | null;
        }>;
    }): Promise<TimeEntryDto[]> {
        await this.planAccess.assertCapability(CAPABILITIES.energyWeek);

        const { account } = await this.accounts.ensureCurrentAccount();
        const existing = await this.repo.find({ account: account.id, loggedOn: input.on });
        const byCategory = new Map(existing.map(row => [row.category, row]));

        const touched: TimeEntry[] = [];
        for (const entry of input.entries) {
            const category = entry.category as TimeCategory;
            let row = byCategory.get(category);
            if (row) {
                row.minutes = entry.minutes;
                row.note = entry.note ?? null;
            } else {
                row = this.em.create(TimeEntry, {
                    household: currentHouseholdId(),
                    account: account.id,
                    loggedOn: input.on,
                    category,
                    minutes: entry.minutes,
                    note: entry.note ?? null,
                } as never);
                this.em.persist(row);
            }
            touched.push(row);
        }
        await this.em.flush();
        return touched.map(row => this.toDto(row));
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    async list(input: { from?: string | null; to?: string | null }): Promise<TimeEntryDto[]> {
        const where: Record<string, unknown> = {};
        if (input.from || input.to) {
            where.loggedOn = {
                ...(input.from ? { $gte: input.from } : {}),
                ...(input.to ? { $lte: input.to } : {}),
            };
        }
        const rows = await this.repo.find(where, {
            orderBy: { loggedOn: 'DESC', category: 'ASC' },
            limit: 500,
        });
        return rows.map(row => this.toDto(row));
    }

    /**
     * One ISO week, every member. Category totals and the discretionary total are the
     * current person's; `members` carries the per-person SNA split so a household can
     * see where paid and unpaid hours actually land.
     */
    async summary(input: { week?: string | null }): Promise<TimeWeekSummary> {
        const week = input.week ?? currentWeek();
        const { from, to } = weekRange(week);
        const { account } = await this.accounts.ensureCurrentAccount();

        const rows: TimeEntry[] = await this.repo.find({ loggedOn: { $gte: from, $lte: to } });
        const mine = rows.filter(row => row.account === account.id);
        const myDays = new Set(mine.map(row => row.loggedOn)).size;

        const minutesByCategory = new Map<TimeCategory, number>();
        for (const row of mine) {
            minutesByCategory.set(
                row.category,
                (minutesByCategory.get(row.category) ?? 0) + row.minutes
            );
        }

        const categories = Object.values(TimeCategory).map(category => {
            const minutes = minutesByCategory.get(category) ?? 0;
            return {
                category,
                kind: TIME_CATEGORY_KIND[category],
                minutes,
                dailyAverage: myDays ? Math.round(minutes / myDays) : 0,
                status: bandStatus(minutes, TIME_REFERENCE[category].band, myDays),
            };
        });

        const discretionaryMinutes = categories
            .filter(summary => summary.kind === TimeKind.FREE)
            .reduce((total, summary) => total + summary.minutes, 0);

        const loggedMinutes = mine.reduce((total, row) => total + row.minutes, 0);

        const perMember = new Map<
            string,
            { days: Set<string>; minutes: Record<TimeKind, number> }
        >();
        for (const row of rows) {
            let bucket = perMember.get(row.account);
            if (!bucket) {
                bucket = { days: new Set(), minutes: this.emptyKinds() };
                perMember.set(row.account, bucket);
            }
            bucket.days.add(row.loggedOn);
            bucket.minutes[TIME_CATEGORY_KIND[row.category]] += row.minutes;
        }

        return {
            week,
            from,
            to,
            daysLogged: myDays,
            loggedMinutes,
            unloggedMinutes: Math.max(0, myDays * MINUTES_PER_DAY - loggedMinutes),
            categories,
            discretionary: {
                minutes: discretionaryMinutes,
                dailyAverage: myDays ? Math.round(discretionaryMinutes / myDays) : 0,
                status: bandStatus(discretionaryMinutes, DISCRETIONARY_BAND, myDays),
            },
            members: [...perMember.entries()].map(([accountId, bucket]) => ({
                accountId,
                daysLogged: bucket.days.size,
                minutes: bucket.minutes,
            })),
        };
    }

    // ====================================================================
    // ? DELETE Operations
    // ====================================================================

    /** A person may only remove their own rows. */
    async delete(input: { id: string }): Promise<void> {
        const { account } = await this.accounts.ensureCurrentAccount();
        const row = await this.repo.findOne({ id: input.id, account: account.id });
        if (!row) throw new NotFoundException('Time entry not found');
        await this.em.remove(row).flush();
    }

    // Private

    private toDto(row: TimeEntry): TimeEntryDto {
        return {
            id: row.id,
            householdId: row.household,
            accountId: row.account,
            on: row.loggedOn,
            category: row.category,
            minutes: row.minutes,
            note: row.note,
        };
    }

    private emptyKinds(): Record<TimeKind, number> {
        return {
            [TimeKind.PERSONAL]: 0,
            [TimeKind.PAID]: 0,
            [TimeKind.UNPAID]: 0,
            [TimeKind.FREE]: 0,
        };
    }
}
