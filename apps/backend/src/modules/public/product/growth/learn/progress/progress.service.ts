import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';
import {
    type LearnProgressStatus,
    type LearnProgress,
    type LearnShelf,
    type LearnSkillKey,
} from '@rumtelo/contracts';

import { HouseholdScopedRepository } from '../../../../../../common/household/household-scoped.repository';
import { AccountService } from '../../../../../auth/user/account/account.service';
import { FocusService } from '../focus/focus.service';
import { LearnProgress as LearnProgressEntity } from './progress.entity';

@Injectable()
export class ProgressService {
    private readonly progress: HouseholdScopedRepository<LearnProgressEntity>;

    constructor(
        @Inject(EntityManager) private readonly em: EntityManager,
        @Inject(AccountService) private readonly accounts: AccountService,
        @Inject(FocusService) private readonly focus: FocusService
    ) {
        this.progress = new HouseholdScopedRepository(em, LearnProgressEntity);
    }

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    async save(input: {
        pieceKey: string;
        status: LearnProgressStatus;
        skill: LearnSkillKey;
        dueOn: string | null;
    }): Promise<LearnProgress> {
        const accountId = await this.accountId();
        const existing = await this.progress.findOne({
            account: accountId,
            pieceKey: input.pieceKey,
        });
        const row =
            existing ??
            this.progress.create({
                account: accountId,
                pieceKey: input.pieceKey,
                status: input.status,
                skill: input.skill,
                dueOn: input.dueOn,
            });
        row.status = input.status;
        row.skill = input.skill;
        row.dueOn = input.dueOn;
        await this.em.persist(row).flush();
        return toProgress(row);
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    async has(pieceKey: string): Promise<boolean> {
        const accountId = await this.accountId();
        const existing = await this.progress.findOne({ account: accountId, pieceKey });
        return existing !== null;
    }

    async list(): Promise<LearnShelf> {
        const accountId = await this.accountId();
        const [progress, focused] = await Promise.all([
            this.progress.find({ account: accountId }, { orderBy: { updatedAt: 'DESC' } }),
            this.focus.list(),
        ]);
        return {
            progress: progress.map(toProgress),
            focused,
        };
    }

    // ====================================================================
    // ? DELETE Operations
    // ====================================================================

    async remove(pieceKey: string): Promise<{ pieceKey: string }> {
        const accountId = await this.accountId();
        const existing = await this.progress.findOne({ account: accountId, pieceKey });
        if (existing) {
            this.progress.remove(existing);
            await this.em.flush();
        }
        return { pieceKey };
    }

    private async accountId(): Promise<string> {
        const { account } = await this.accounts.ensureCurrentAccount();
        return account.id;
    }
}

function asDate(value: string | Date | null): string | null {
    if (value === null) return null;
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return value.slice(0, 10);
}

function toProgress(row: LearnProgressEntity): LearnProgress {
    return {
        id: row.id,
        householdId: row.household,
        accountId: row.account,
        pieceKey: row.pieceKey,
        status: row.status,
        skill: row.skill,
        dueOn: asDate(row.dueOn),
    };
}
