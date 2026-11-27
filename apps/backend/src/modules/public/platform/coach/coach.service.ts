import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { CoachKind } from '@rumtelo/contracts';

import { currentPeriod } from '../../../../common/utils/period.util';
import { HouseholdScopedRepository } from '../../../../common/household/household-scoped.repository';
import { AccountService } from '../../../auth/user/account/account.service';
import { CoachMessage } from './coach-message.entity';

/** A line a producer wants in the inbox this period. */
export type CoachDraft = {
    key: string;
    kind: CoachKind;
    text: string;
    ctaLabel: string | null;
    ctaHref: string | null;
    /** Optional second move; omit on tips that carry one action. */
    ctaSecondaryLabel?: string | null;
    ctaSecondaryHref?: string | null;
    /**
     * Stable prefix of `key` for tips whose numbers change often (`rule:2026-11` of
     * `rule:2026-11:12500`). A row under the same identity is the same tip: it is updated in
     * place and a dismissal sticks, so a €1 edit to a bill does not bring a hidden tip back.
     */
    identity?: string;
};

/** Urgency first, then recency — the strip and the inbox share this order. */
const KIND_RANK: Record<CoachKind, number> = {
    [CoachKind.WARNING]: 0,
    [CoachKind.NUDGE]: 1,
    [CoachKind.INSIGHT]: 2,
    [CoachKind.WEEK_CHECK]: 3,
    [CoachKind.WIN]: 4,
};

type CoachRefresher = (period: string) => Promise<void>;

@Injectable()
export class CoachService {
    private readonly logger = new Logger(CoachService.name);
    private readonly repo: HouseholdScopedRepository<CoachMessage>;
    private readonly refreshers: CoachRefresher[] = [];

    constructor(
        @Inject(EntityManager) private readonly em: EntityManager,
        @Inject(AccountService) private readonly accounts: AccountService
    ) {
        this.repo = new HouseholdScopedRepository(em, CoachMessage);
    }

    /**
     * Producers register here so a visit to the inbox (or any dashboard that
     * reads it) evaluates their rules without the coach module importing them.
     */
    registerRefresher(refresh: CoachRefresher): void {
        this.refreshers.push(refresh);
    }

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    /**
     * Upsert the drafts for one person under `prefix`, retract undismissed
     * rows from that prefix that no longer apply. Dismissed keys are left
     * alone so the same tip does not come back. `accountId` null writes
     * household-wide rows (every member sees them; hiding one hides it for all).
     */
    async sync(
        accountId: string | null,
        prefix: string,
        drafts: readonly CoachDraft[]
    ): Promise<void> {
        const period = currentPeriod();
        const existing = await this.repo.find({
            account: accountId,
            key: { $like: `${prefix}%` },
        });
        const matchOf = (draft: CoachDraft) =>
            existing.find(candidate => candidate.key === draft.key) ??
            (draft.identity
                ? existing.find(
                      candidate =>
                          candidate.key === draft.identity ||
                          candidate.key?.startsWith(`${draft.identity}:`)
                  )
                : undefined);
        const matched = new Set(
            drafts.map(matchOf).filter((row): row is CoachMessage => row !== undefined)
        );

        for (const row of existing) {
            if (row.key && !matched.has(row) && row.dismissedAt === null) {
                this.em.remove(row);
            }
        }

        for (const draft of drafts) {
            const row = matchOf(draft);
            if (row?.dismissedAt) continue;
            if (row) {
                row.key = draft.key;
                row.kind = draft.kind;
                row.text = draft.text;
                row.ctaLabel = draft.ctaLabel;
                row.ctaHref = draft.ctaHref;
                row.ctaSecondaryLabel = draft.ctaSecondaryLabel ?? null;
                row.ctaSecondaryHref = draft.ctaSecondaryHref ?? null;
                row.period = period;
                continue;
            }
            const created = this.repo.create({
                account: accountId,
                key: draft.key,
                period,
                kind: draft.kind,
                text: draft.text,
                ctaLabel: draft.ctaLabel,
                ctaHref: draft.ctaHref,
                ctaSecondaryLabel: draft.ctaSecondaryLabel ?? null,
                ctaSecondaryHref: draft.ctaSecondaryHref ?? null,
                dismissedAt: null,
            });
            this.em.persist(created);
        }
        await this.em.flush();
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    async feed(period: string) {
        if (period === currentPeriod()) {
            // One failing producer must not take the whole feed (and Home) down with it.
            const results = await Promise.allSettled(
                this.refreshers.map(refresh => refresh(period))
            );
            for (const result of results) {
                if (result.status === 'rejected') {
                    const reason = result.reason as { name?: string; message?: string };
                    this.logger.warn(
                        `Coach refresher failed: ${reason?.name ?? 'Error'} ${reason?.message ?? ''}`
                    );
                }
            }
        }

        const { account } = await this.accounts.ensureCurrentAccount();
        const rows: CoachMessage[] = await this.repo.find(
            {
                period,
                dismissedAt: null,
                $or: [{ account: null }, { account: account.id }],
            },
            { orderBy: { createdAt: 'DESC' }, limit: 20 }
        );
        rows.sort((left, right) => {
            const rank = KIND_RANK[left.kind] - KIND_RANK[right.kind];
            if (rank !== 0) return rank;
            return right.createdAt.getTime() - left.createdAt.getTime();
        });
        return rows.map(message => this.toDto(message));
    }

    // ====================================================================
    // ? UPDATE Operations
    // ====================================================================

    async dismiss(id: string) {
        const message = await this.repo.findOneOrFail({ id });
        message.dismissedAt = new Date();
        await this.em.flush();
    }

    // Private

    private toDto(message: CoachMessage) {
        return {
            id: message.id,
            householdId: message.household,
            accountId: message.account,
            key: message.key,
            period: message.period,
            kind: message.kind,
            text: message.text,
            ctaLabel: message.ctaLabel,
            ctaHref: message.ctaHref,
            ctaSecondaryLabel: message.ctaSecondaryLabel,
            ctaSecondaryHref: message.ctaSecondaryHref,
            dismissedAt: message.dismissedAt?.toISOString() ?? null,
            createdAt: message.createdAt.toISOString(),
        };
    }
}
