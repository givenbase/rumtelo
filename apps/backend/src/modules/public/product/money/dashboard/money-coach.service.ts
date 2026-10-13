import { Inject, Injectable } from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';
import {
    CoachFeatureId,
    CoachKind,
    DEFAULT_JAR_SPLIT,
    FlowDirection,
    FixedCostPeriodStatus,
    JarKey,
    MONEY_COACH_KEY_PREFIX,
    SPLIT_SOFT_CEILING,
    isCoachFeatureEnabledAtLaunch,
} from '@rumtelo/contracts';
import { fixedCostPeriodStatus } from '@rumtelo/utils';

import { AccountService } from '../../../../auth/user/account/account.service';
import { currentPeriod } from '../../../../../common/utils/period.util';
import { CoachService } from '../../../platform/coach/coach.service';
import type { CoachDraft } from '../../../platform/coach/coach.service';
import { TransactionService } from '../ledger/transaction/transaction.service';
import { FixedCostService } from '../plan/fixed-cost/fixed-cost.service';
import { JarService } from '../plan/jar/jar.service';

const FIXED_HREF = '/product/money/fixed-costs';
const INBOX_HREF = '/product/money/transactions';
const JARS_HREF = '/product/money';
const INBOX_TIP_MIN = 3;
/** Same ceiling as the in-app split coach — 55% is the goal, bridging up to here stays quiet. */
const NECESSITIES_SOFT_CEILING = SPLIT_SOFT_CEILING[JarKey.NECESSITIES];
const NECESSITIES_GOAL = DEFAULT_JAR_SPLIT[JarKey.NECESSITIES];

/**
 * Money inbox tip producers — due bills, unsorted inbox, soft Necessities share.
 * Rule-based; pairs with on-screen jar helpers (informatie, nooit schaamte).
 */
@Injectable()
export class MoneyCoachService implements OnModuleInit {
    constructor(
        @Inject(AccountService) private readonly accounts: AccountService,
        @Inject(CoachService) private readonly coach: CoachService,
        @Inject(FixedCostService) private readonly fixedCosts: FixedCostService,
        @Inject(TransactionService) private readonly transactions: TransactionService,
        @Inject(JarService) private readonly jars: JarService
    ) {}

    onModuleInit(): void {
        this.coach.registerRefresher(() => this.refresh());
    }

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    async refresh(): Promise<void> {
        if (
            !isCoachFeatureEnabledAtLaunch(CoachFeatureId.MONEY_TIP_PRODUCERS, {
                nodeEnv: process.env.NODE_ENV,
            })
        ) {
            return;
        }
        const { account } = await this.accounts.ensureCurrentAccount();
        const drafts = await this.evaluate();
        await this.coach.sync(account.id, MONEY_COACH_KEY_PREFIX, drafts);
    }

    // Private

    private async evaluate(): Promise<CoachDraft[]> {
        const period = currentPeriod();
        const drafts: CoachDraft[] = [];

        const dueCount = await this.countDueBills(period);
        if (dueCount >= 1) {
            drafts.push({
                key: `${MONEY_COACH_KEY_PREFIX}due_bills:${period}:${dueCount}`,
                kind: CoachKind.NUDGE,
                text:
                    dueCount === 1
                        ? '1 fixed cost is still due this period. Tap Due, then confirm, to mark it paid.'
                        : `${dueCount} fixed costs are still due this period. Tap Due on each bill, then confirm, to mark it paid.`,
                ctaLabel: 'Open fixed costs',
                ctaHref: FIXED_HREF,
            });
        }

        const inboxCount = await this.transactions.countInbox();
        if (inboxCount >= INBOX_TIP_MIN) {
            drafts.push({
                key: `${MONEY_COACH_KEY_PREFIX}inbox_unsorted:${period}:${inboxCount}`,
                kind: CoachKind.NUDGE,
                text: `${inboxCount} transactions wait in the inbox. Sort them into jars so the picture stays honest.`,
                ctaLabel: 'Open inbox',
                ctaHref: INBOX_HREF,
            });
        }

        const jars = await this.jars.list();
        const necessities = jars.find(jar => jar.key === JarKey.NECESSITIES);
        const necPct = necessities ? necessities.percentage : null;
        if (necPct !== null && Number.isFinite(necPct) && necPct > NECESSITIES_SOFT_CEILING) {
            drafts.push({
                key: `${MONEY_COACH_KEY_PREFIX}necessities_share:${period}:${Math.round(necPct)}`,
                kind: CoachKind.INSIGHT,
                text: `Necessities is at ${Math.round(necPct)}% — the goal is ${NECESSITIES_GOAL}%. Fine for now; to close the gap, trim fixed costs or raise income and leave Freedom untouched.`,
                ctaLabel: 'Review jars',
                ctaHref: JARS_HREF,
            });
        }

        return drafts;
    }

    private async countDueBills(period: string): Promise<number> {
        const [items, settlements] = await Promise.all([
            this.fixedCosts.list(FlowDirection.OUT),
            this.fixedCosts.listSettlements({ period }),
        ]);
        const byCost = new Map(
            settlements.map(row => [row.fixedCostId, { status: row.status }] as const)
        );
        let due = 0;
        for (const item of items) {
            if (!item.isActive) continue;
            const status = fixedCostPeriodStatus(item, byCost.get(item.id) ?? null, period);
            if (status === FixedCostPeriodStatus.DUE) due += 1;
        }
        return due;
    }
}
