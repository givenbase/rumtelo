import { Inject, Injectable } from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';
import {
    CAPABILITIES,
    CoachFeatureId,
    CoachKind,
    DEFAULT_GROUP_SPLIT,
    FIXED_COSTS_COACH_KEY_PREFIX,
    FlowDirection,
    FixedCostPeriodStatus,
    GROUP_SOFT_CEILING,
    JarGroup,
    MONEY_COACH_KEY_PREFIX,
    hasCapability,
    isCoachFeatureEnabledAtLaunch,
    jarGroupFor,
    sumPercentageByGroup,
} from '@rumtelo/contracts';
import { evaluateBusinessHouseholdLeak, fixedCostPeriodStatus, formatMoney } from '@rumtelo/utils';

import { PlanAccessService } from '../../../../../common/capability';
import { currentHouseholdId } from '../../../../../common/household/household.context';
import { HouseholdSettingsService } from '../../../../auth/household/household-settings/household-settings.service';
import { AccountService } from '../../../../auth/user/account/account.service';
import { currentPeriod } from '../../../../../common/utils/period.util';
import { AssetService } from '../../growth/asset/asset.service';
import { CoachService } from '../../../platform/coach/coach.service';
import type { CoachDraft } from '../../../platform/coach/coach.service';
import { TransactionService } from '../ledger/transaction/transaction.service';
import { FixedCostService } from '../plan/fixed-cost/fixed-cost.service';
import { JarService } from '../plan/jar/jar.service';
import {
    type CoachBill,
    evaluateOverNecessities,
    evaluateSubscriptionReview,
    quarterKeyOf,
} from './fixed-cost-coach.util';

const FIXED_HREF = '/product/money/fixed-costs';
const INCOME_CREATE_HREF = '/product/money/income/create';
const INBOX_HREF = '/product/money/transactions';
const JARS_HREF = '/product/money';
const INBOX_TIP_MIN = 3;
/**
 * The Basics group (NECESSITIES plus DAILY when on) is measured as a whole: 55% is the goal,
 * bridging up to the soft ceiling stays quiet. `?? Infinity`: a group without a ceiling never fires.
 */
const BASICS_SOFT_CEILING = GROUP_SOFT_CEILING[JarGroup.BASIS] ?? Number.POSITIVE_INFINITY;
const BASICS_GOAL = DEFAULT_GROUP_SPLIT[JarGroup.BASIS];

/**
 * Money inbox tip producers — due bills, unsorted inbox, soft Basics share, and the
 * household-wide fixed-cost tips (over the Basics split, business costs paid from the
 * household, a quarterly subscription review).
 * Rule-based; pairs with on-screen jar helpers (informatie, nooit schaamte).
 */
@Injectable()
export class MoneyCoachService implements OnModuleInit {
    constructor(
        @Inject(AccountService) private readonly accounts: AccountService,
        @Inject(CoachService) private readonly coach: CoachService,
        @Inject(FixedCostService) private readonly fixedCosts: FixedCostService,
        @Inject(TransactionService) private readonly transactions: TransactionService,
        @Inject(JarService) private readonly jars: JarService,
        @Inject(AssetService) private readonly assets: AssetService,
        @Inject(PlanAccessService) private readonly planAccess: PlanAccessService,
        @Inject(HouseholdSettingsService)
        private readonly householdSettings: HouseholdSettingsService
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
        const jars = await this.jars.list();
        const drafts = await this.evaluate(jars);
        await this.coach.sync(account.id, MONEY_COACH_KEY_PREFIX, drafts);
        // Household-wide (no account): one dismissal hides the tip for everyone on the board.
        const fixedCostDrafts = await this.evaluateFixedCosts(jars);
        await this.coach.sync(null, FIXED_COSTS_COACH_KEY_PREFIX, fixedCostDrafts);
    }

    // Private

    private async evaluate(jars: Awaited<ReturnType<JarService['list']>>): Promise<CoachDraft[]> {
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

        // Group sum in basis points (`sumPercentageByGroup`), so a refined Basics (NECESSITIES +
        // DAILY) reads the same as an unrefined one. The key keeps its `necessities_share` name
        // so earlier dismissals stay hidden and the client copy keeps matching.
        const hasBasics = jars.some(jar => jarGroupFor(jar.key) === JarGroup.BASIS);
        const basicsPct = sumPercentageByGroup(jars)[JarGroup.BASIS];
        if (hasBasics && Number.isFinite(basicsPct) && basicsPct > BASICS_SOFT_CEILING) {
            drafts.push({
                key: `${MONEY_COACH_KEY_PREFIX}necessities_share:${period}:${Math.round(basicsPct)}`,
                kind: CoachKind.INSIGHT,
                // No stored pot name here: the name depends on whether Basics is refined.
                text: `Basics is at ${Math.round(basicsPct)}% — the goal is ${BASICS_GOAL}%. Fine for now; to close the gap, trim fixed costs or raise income and leave Future untouched.`,
                ctaLabel: 'Review jars',
                ctaHref: JARS_HREF,
            });
        }

        return drafts;
    }

    /**
     * Household-wide fixed-cost tips. Keys are `rule:<period or quarter>:<numbers>` and carry an
     * `identity` (the part before the numbers), so a hidden tip stays hidden while the amounts
     * move. The numbers in the key let the client localise the sentence.
     */
    private async evaluateFixedCosts(
        jars: Awaited<ReturnType<JarService['list']>>
    ): Promise<CoachDraft[]> {
        const now = new Date();
        const today = now.toISOString().slice(0, 10);
        const period = currentPeriod(now);
        const quarter = quarterKeyOf(now);
        const drafts: CoachDraft[] = [];

        const [bills, netMonthlyCents] = await Promise.all([
            this.fixedCosts.list(FlowDirection.OUT),
            this.jars.monthlyNetIncome(today),
        ]);
        const { currency } = await this.householdSettings.get(currentHouseholdId());
        const money = (cents: number) => formatMoney(cents, { currency });

        const over = evaluateOverNecessities({
            netMonthlyCents,
            jars: jars.map(jar => ({
                id: jar.id,
                key: jar.key,
                percentage: jar.percentage,
            })),
            bills,
            asOf: today,
        });
        if (over) {
            const identity = `${FIXED_COSTS_COACH_KEY_PREFIX}over_necessities:${period}`;
            drafts.push({
                key: `${identity}:${over.shortfallCents}`,
                identity,
                kind: CoachKind.NUDGE,
                text: `Your bills come to ${money(over.shortfallCents)} a month more than the pot that pays them gets.`,
                ctaLabel: 'Add income',
                ctaHref: INCOME_CREATE_HREF,
                ctaSecondaryLabel: 'Open the biggest fixed cost',
                ctaSecondaryHref: `${FIXED_HREF}/${over.biggestBillId}`,
            });
        }

        const leak = await this.businessLeak(bills, today);
        if (leak) {
            const identity = `${FIXED_COSTS_COACH_KEY_PREFIX}business_leak:${period}`;
            const amount = money(leak.monthlyOutCents);
            drafts.push({
                key: `${identity}:${leak.monthlyOutCents}:${leak.billCount}`,
                identity,
                kind: CoachKind.NUDGE,
                text: leak.primaryName
                    ? `${amount} a month for ${leak.primaryName} is paid from your household.`
                    : `${amount} a month in business costs is paid from your household.`,
                ctaLabel: 'Review these bills',
                // One business: open its bills. Several: the whole list, so none is left out.
                ctaHref:
                    leak.assetIds.length === 1
                        ? `${FIXED_HREF}?assetId=${leak.assetIds[0]}`
                        : FIXED_HREF,
            });
        }

        const review = evaluateSubscriptionReview({ bills, asOf: today });
        if (review) {
            // Quarter in the identity: a dismissal holds until the next quarter starts.
            const identity = `${FIXED_COSTS_COACH_KEY_PREFIX}subscription_review:${quarter}`;
            drafts.push({
                key: `${identity}:${review.count}:${review.monthlyCents}`,
                identity,
                kind: CoachKind.INSIGHT,
                text:
                    review.count === 1
                        ? `1 subscription costs ${money(review.monthlyCents)} a month. Still using it?`
                        : `${review.count} subscriptions cost ${money(review.monthlyCents)} a month. Still using all of them?`,
                ctaLabel: 'Review subscriptions',
                ctaHref: FIXED_HREF,
            });
        }

        return drafts;
    }

    /** Business holdings whose bills still run through the household jars (needs net worth). */
    private async businessLeak(bills: readonly CoachBill[], asOf: string) {
        const planKey = await this.planAccess.planKeyForCurrentHousehold();
        if (!hasCapability(CAPABILITIES.growthNetWorth, planKey)) return null;
        const leak = evaluateBusinessHouseholdLeak({
            assets: await this.assets.list(),
            bills,
            asOf,
        });
        return leak.active ? leak : null;
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
