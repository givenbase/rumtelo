import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';
import { CAPABILITIES, TimeCategory } from '@rumtelo/contracts';
import type {
    TimeDayKind,
    TimeMinutesByCategory,
    TimeTemplate as TimeTemplateDto,
} from '@rumtelo/contracts';

import { PlanAccessService } from '../../../../../common/capability';
import { HouseholdScopedRepository } from '../../../../../common/household/household-scoped.repository';
import { currentHouseholdId } from '../../../../../common/household/household.context';
import { AccountService } from '../../../../auth/user/account/account.service';
import { TimeEntry } from '../time/time-entry.entity';

import { TimeTemplate } from './time-template.entity';

/** Days of history the learned default is drawn from. */
const LEARN_WINDOW_DAYS = 28;
/** Fewer logged days than this and the setup answers stay the default. */
const LEARN_MIN_DAYS = 3;

@Injectable()
export class TimeTemplateService {
    private readonly repo: HouseholdScopedRepository<TimeTemplate>;
    private readonly entries: HouseholdScopedRepository<TimeEntry>;
    constructor(
        @Inject(EntityManager) private readonly em: EntityManager,
        @Inject(PlanAccessService) private readonly planAccess: PlanAccessService,
        @Inject(AccountService) private readonly accounts: AccountService
    ) {
        this.repo = new HouseholdScopedRepository(em, TimeTemplate);
        this.entries = new HouseholdScopedRepository(em, TimeEntry);
    }

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    /** Upsert both shapes for the current person. */
    async create(input: {
        householdId: string;
        templates: ReadonlyArray<{
            kind: keyof typeof TimeDayKind;
            weekdays: number[];
            minutes: TimeMinutesByCategory;
        }>;
    }): Promise<TimeTemplateDto[]> {
        await this.planAccess.assertCapability(CAPABILITIES.energyWeek);
        const { account } = await this.accounts.ensureCurrentAccount();

        const existing: TimeTemplate[] = await this.repo.find({ account: account.id });
        const byKind = new Map(existing.map(row => [row.kind, row]));

        const rows: TimeTemplate[] = [];
        for (const template of input.templates) {
            const kind = template.kind as TimeDayKind;
            let row = byKind.get(kind);
            if (row) {
                row.weekdays = [...template.weekdays];
                row.minutes = { ...template.minutes };
            } else {
                row = this.em.create(TimeTemplate, {
                    household: currentHouseholdId(),
                    account: account.id,
                    kind,
                    weekdays: [...template.weekdays],
                    minutes: { ...template.minutes },
                } as never);
                this.em.persist(row);
            }
            rows.push(row);
        }
        await this.em.flush();
        return this.withLearned(account.id, rows);
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    async list(): Promise<TimeTemplateDto[]> {
        const { account } = await this.accounts.ensureCurrentAccount();
        const rows: TimeTemplate[] = await this.repo.find(
            { account: account.id },
            { orderBy: { kind: 'ASC' } }
        );
        return this.withLearned(account.id, rows);
    }

    // Private

    /**
     * Median minutes per category over the person's logged days that fall on each
     * template's weekdays. Medians, not means: one sick day should not move a default.
     */
    private async withLearned(accountId: string, rows: TimeTemplate[]): Promise<TimeTemplateDto[]> {
        if (rows.length === 0) return [];

        const since = new Date();
        since.setUTCDate(since.getUTCDate() - LEARN_WINDOW_DAYS);
        const history: TimeEntry[] = await this.entries.find({
            account: accountId,
            loggedOn: { $gte: since.toISOString().slice(0, 10) },
        });

        // day → category → minutes
        const days = new Map<string, Partial<Record<TimeCategory, number>>>();
        for (const entry of history) {
            const day = days.get(entry.loggedOn) ?? {};
            day[entry.category] = entry.minutes;
            days.set(entry.loggedOn, day);
        }

        return rows.map(row => {
            const weekdays = new Set(row.weekdays);
            const matching = [...days.entries()]
                .filter(([loggedOn]) => weekdays.has(isoWeekday(loggedOn)))
                .map(([, minutes]) => minutes);

            const learned =
                matching.length >= LEARN_MIN_DAYS
                    ? Object.fromEntries(
                          Object.values(TimeCategory).map(category => [
                              category,
                              median(matching.map(day => day[category] ?? 0)),
                          ])
                      )
                    : null;

            return {
                id: row.id,
                householdId: row.household,
                accountId: row.account,
                kind: row.kind,
                weekdays: [...row.weekdays],
                minutes: { ...row.minutes },
                learned,
                learnedDays: matching.length,
            };
        });
    }
}

function isoWeekday(iso: string): number {
    const [year, month, day] = iso.split('-').map(Number) as [number, number, number];
    return new Date(Date.UTC(year, month - 1, day)).getUTCDay() || 7;
}

function median(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((left, right) => left - right);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2
        ? sorted[middle]!
        : Math.round((sorted[middle - 1]! + sorted[middle]!) / 2);
}
