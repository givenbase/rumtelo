import { v7 as uuidv7 } from 'uuid';

import type { EntityManager } from '@mikro-orm/postgresql';
import { Seeder } from '@mikro-orm/seeder';
import {
    AccountKind,
    Cadence,
    Currency,
    DebtKind,
    EnergyMetric,
    FlowDirection,
    GoalKind,
    GoalStatus,
    HouseholdKind,
    IncomeKind,
    IncomeStability,
    LearnProgressStatus,
    Locale,
    PayoffStrategy,
    RuleField,
    RuleMatcher,
    SpendingStyle,
    Theme,
    TransactionSource,
    TransactionStatus,
} from '@rumtelo/contracts';
import { DEMO_ACCOUNTS, type DemoAccount, type DemoPersona } from '@rumtelo/contracts/platform';
import { toMinorUnits } from '@rumtelo/utils';

import { loadEnv } from '../../../common/config/env.config';
import { loadEnvFiles } from '../../../common/config/load-env';
import { createAuth } from '../../../modules/auth/engine/auth.config';
import { AuthMember } from '../../../modules/auth/household/managed/member/auth-member.entity';
import { AuthHousehold } from '../../../modules/auth/household/managed/household/auth-household.entity';
import { AuthUser } from '../../../modules/auth/user/managed/user/auth-user.entity';
import { Account } from '../../../modules/auth/user/account/account.entity';
import { AccountSettings } from '../../../modules/auth/user/account/account-settings/account-settings.entity';
import { JarTemplate } from '../../../modules/backoffice/product/money/template/jar/jar.entity';
import { Bank } from '../../../modules/backoffice/product/money/catalog/bank/bank.entity';
import { HouseholdSettings } from '../../../modules/auth/household/household-settings/household-settings.entity';
import { HouseholdBilling } from '../../../modules/auth/household/household-billing/household-billing.entity';
import { EnergyLog } from '../../../modules/public/product/energy/log/energy-log.entity';
import { IncomeLever } from '../../../modules/public/product/growth/income-lever/income-lever.entity';
import { IncomeMilestone } from '../../../modules/public/product/growth/income-milestone/income-milestone.entity';
import { BankAccount } from '../../../modules/public/product/money/ledger/bank-account/bank-account.entity';
import { SortRule } from '../../../modules/public/product/money/ledger/sort-rule/sort-rule.entity';
import { Transaction } from '../../../modules/public/product/money/ledger/transaction/transaction.entity';
import { FixedCost } from '../../../modules/public/product/money/plan/fixed-cost/fixed-cost.entity';
import { IncomeAmountPeriod } from '../../../modules/public/product/money/plan/income/income-amount-period.entity';
import { IncomeSource } from '../../../modules/public/product/money/plan/income/income-source.entity';
import { Jar } from '../../../modules/public/product/money/plan/jar/jar.entity';
import { Category } from '../../../modules/public/product/money/plan/jar/category.entity';
import { Debt } from '../../../modules/public/product/money/targets/debt/debt.entity';
import { Goal } from '../../../modules/public/product/money/targets/goal/goal.entity';
import { Asset } from '../../../modules/public/product/growth/asset/asset.entity';
import { LearnSkillFocus } from '../../../modules/public/product/growth/learn/focus/focus.entity';
import { LearnProgress } from '../../../modules/public/product/growth/learn/progress/progress.entity';
import { Gratitude } from '../../../modules/public/product/soul/gratitude/gratitude.entity';
import { CategoryTemplate } from '../../../modules/backoffice/product/money/template/category/category.entity';
import { FixedCostPreset } from '../../../modules/backoffice/product/money/preset/fixed-cost/fixed-cost.entity';
import { MerchantPreset } from '../../../modules/backoffice/product/money/preset/merchant/merchant.entity';

loadEnvFiles();

/** Where the max persona's Give jar flows — a name from the giving-organisation catalog. */
const DEMO_GIVE_COUNTERPARTY = 'GiveDirectly';

/** Persona jar splits (must sum to 100) — shaped for the story, not the catalog default. */
const JAR_SPLIT: Record<DemoPersona, Record<string, number>> = {
    basic: {
        NECESSITIES: 55,
        FINANCIAL_FREEDOM: 5,
        EDUCATION: 5,
        LONG_TERM_SAVINGS: 15,
        PLAY: 15,
        GIVE: 5,
    },
    plus: {
        NECESSITIES: 50,
        FINANCIAL_FREEDOM: 5,
        EDUCATION: 5,
        LONG_TERM_SAVINGS: 10,
        PLAY: 20,
        GIVE: 10,
    },
    max: {
        NECESSITIES: 35,
        FINANCIAL_FREEDOM: 25,
        EDUCATION: 10,
        LONG_TERM_SAVINGS: 15,
        PLAY: 10,
        GIVE: 5,
    },
};

type JarMap = {
    necessities: Jar;
    ff: Jar;
    education: Jar;
    lts: Jar;
    play: Jar;
    give: Jar;
    all: Jar[];
};

/** Demo fixed-cost labels → category template name (when catalog name differs). */
const DEMO_FIXED_CATEGORY: Record<string, string> = {
    Rent: 'Housing',
    Mortgage: 'Housing',
    'Property tax escrow': 'Taxes',
    Utilities: 'Utilities',
    Groceries: 'Groceries',
    Phone: 'Subscriptions',
    'Phone + internet': 'Subscriptions',
    'Transit pass': 'Transport',
    'Health + life insurance': 'Insurance',
    Coworking: 'Other',
    'Software stack': 'Subscriptions',
    'Brokerage fees': 'Index funds',
    'Learning subscriptions': 'Courses',
    'Charitable giving': 'Donations',
};

/**
 * Demo tx counterparty/description needles → category under the row's jar.
 * Used when no merchant preset matches (or jar differs from the catalog default).
 */
const DEMO_TX_CATEGORY: Array<{ includes: string; category: string }> = [
    { includes: 'landlord', category: 'Housing' },
    { includes: 'rent', category: 'Housing' },
    { includes: 'mortgage', category: 'Housing' },
    { includes: 'supermarket', category: 'Groceries' },
    { includes: 'whole foods', category: 'Groceries' },
    { includes: 'grocer', category: 'Groceries' },
    { includes: 'pharmacy', category: 'Pharmacy' },
    { includes: 'transit', category: 'Transport' },
    { includes: 'bus', category: 'Transport' },
    { includes: 'uber eats', category: 'Eating out' },
    { includes: 'uber', category: 'Transport' },
    { includes: 'mobile', category: 'Subscriptions' },
    { includes: 'phone', category: 'Subscriptions' },
    { includes: 'cafe', category: 'Eating out' },
    { includes: 'coffee', category: 'Eating out' },
    { includes: 'bookstore', category: 'Books' },
    { includes: 'learnco', category: 'Courses' },
    { includes: 'masterclass', category: 'Courses' },
    { includes: 'vanguard', category: 'Index funds' },
    { includes: 'broker', category: 'Index funds' },
    { includes: 'dividend', category: 'Index funds' },
    { includes: 'givedirectly', category: 'Donations' },
    { includes: 'visa', category: 'Debt payments' },
    { includes: 'credit card', category: 'Debt payments' },
    { includes: 'leaseco', category: 'Transport' },
    { includes: 'car lease', category: 'Transport' },
    { includes: 'finco', category: 'Debt payments' },
    { includes: 'laptop loan', category: 'Debt payments' },
];

/**
 * Seeds three plan personas (Basic / Plus / Max) with better-auth users,
 * households, and persona-shaped lived-in boards.
 *
 * Money in this file is authored in **euros** (major units). Persist via
 * {@link toMinorUnits} — industry standard integer cents / minor units.
 */
type DemoBanks = { primary: Bank; secondary: Bank };

export class DemoHouseholdSeeder extends Seeder {
    async run(em: EntityManager): Promise<void> {
        const env = loadEnv();
        const auth = createAuth(env);

        const templates = await em.find(
            JarTemplate,
            { isActive: true },
            { orderBy: { sortOrder: 'ASC' } }
        );
        if (templates.length === 0) {
            throw new Error('DemoHouseholdSeeder: no jar templates — run JarTemplateSeeder first');
        }

        await Promise.all(
            DEMO_ACCOUNTS.map(account => this.seedPersona(em.fork(), auth, account, templates))
        );
    }

    private async seedPersona(
        em: EntityManager,
        auth: ReturnType<typeof createAuth>,
        demo: DemoAccount,
        templates: JarTemplate[]
    ): Promise<void> {
        let user = await em.findOne(AuthUser, { email: demo.email });
        if (!user) {
            const result = await auth.api.signUpEmail({
                body: {
                    email: demo.email,
                    password: demo.password,
                    name: demo.name,
                },
            });
            const userId = result?.user?.id;
            if (!userId) {
                throw new Error(`DemoHouseholdSeeder: signUp failed for ${demo.email}`);
            }
            user = await em.findOneOrFail(AuthUser, { id: userId });
        }

        // Always (re)apply the demo password — re-seed must rotate credentials when
        // DEMO_ACCOUNTS passwords change (signup only runs for brand-new users).
        await this.ensureDemoPassword(auth, user.id, demo.password);

        if (!user.emailVerified) {
            user.emailVerified = true;
            user.updatedAt = new Date();
            em.persist(user);
        }
        if (user.name !== demo.name) {
            user.name = demo.name;
            user.updatedAt = new Date();
            em.persist(user);
        }

        const spendingStyle =
            demo.persona === 'max'
                ? SpendingStyle.SAVER
                : demo.persona === 'plus'
                  ? SpendingStyle.BALANCED
                  : SpendingStyle.SPENDER;

        let rumteloAccount = await em.findOne(Account, { user }, { populate: ['settings'] });
        if (!rumteloAccount) {
            rumteloAccount = em.create(Account, {
                user,
                firstName: demo.firstName,
                middleName: demo.middleName ?? null,
                lastName: demo.lastName,
                phone: demo.phone,
                dateOfBirth: demo.dateOfBirth,
            } as never);
            em.persist(rumteloAccount);
            em.create(AccountSettings, {
                account: rumteloAccount,
                locale: Locale.EN,
                theme: Theme.SYSTEM,
                spendingStyle,
                onboardedAt: new Date(),
            } as never);
        } else {
            rumteloAccount.firstName = demo.firstName;
            rumteloAccount.middleName = demo.middleName ?? null;
            rumteloAccount.lastName = demo.lastName;
            rumteloAccount.phone = demo.phone;
            rumteloAccount.dateOfBirth = demo.dateOfBirth;
            const settings = await em.findOne(AccountSettings, { account: rumteloAccount });
            if (settings) {
                settings.locale = Locale.EN;
                settings.spendingStyle = spendingStyle;
                if (!settings.onboardedAt) settings.onboardedAt = new Date();
            }
        }

        let org = await em.findOne(AuthHousehold, { slug: demo.slug });
        if (!org) {
            org = em.create(AuthHousehold, {
                id: authUuid(),
                name: demo.householdName,
                slug: demo.slug,
                createdAt: new Date(),
            } as never);
            em.persist(org);
            em.create(AuthMember, {
                id: authUuid(),
                household: org,
                user,
                role: 'owner',
                createdAt: new Date(),
            } as never);
        } else {
            org.name = demo.householdName;
        }

        const householdId = org.id;
        const householdKind =
            demo.persona === 'max'
                ? HouseholdKind.PARTNERS
                : demo.persona === 'plus'
                  ? HouseholdKind.SOLO
                  : HouseholdKind.SOLO;

        let settings = await em.findOne(HouseholdSettings, { household: householdId });
        const money = {
            periodStartDay: 1,
            incomeStability:
                demo.persona === 'basic' ? IncomeStability.STABLE : IncomeStability.VARIABLE,
            payoffStrategy:
                demo.persona === 'plus' ? PayoffStrategy.SNOWBALL : PayoffStrategy.AVALANCHE,
        };
        const features = {
            isBankSyncEnabled: demo.persona !== 'basic',
            isCoachEnabled: true,
        };

        if (!settings) {
            settings = em.create(HouseholdSettings, {
                household: householdId,
                why: demo.why,
                kind: householdKind,
                currency: Currency.EUR,
                money,
                features,
                weekCheck: { reminderDay: 7, reminderAt: '19:00' },
                onboardedAt: new Date(),
            } as never);
            em.persist(settings);
        } else {
            settings.why = demo.why;
            settings.kind = householdKind;
            settings.currency = Currency.EUR;
            settings.money = { ...settings.money, ...money };
            settings.features = { ...settings.features, ...features };
            if (!settings.onboardedAt) settings.onboardedAt = new Date();
        }

        const ingBank = await em.findOne(Bank, { key: 'ING', isActive: true });
        const abnBank = await em.findOne(Bank, { key: 'ABN_AMRO', isActive: true });
        if (!ingBank) {
            throw new Error('DemoHouseholdSeeder: Bank catalog missing ING — run BankSeeder first');
        }
        const demoBanks: DemoBanks = {
            primary: ingBank,
            secondary: abnBank ?? ingBank,
        };

        let billing = await em.findOne(HouseholdBilling, { household: householdId });
        if (!billing) {
            billing = em.create(HouseholdBilling, {
                household: householdId,
                planKey: demo.planKey,
            } as never);
            em.persist(billing);
        } else {
            billing.planKey = demo.planKey;
        }

        const jarCount = await em.count(Jar, { household: householdId });
        const split = JAR_SPLIT[demo.persona];
        if (jarCount === 0) {
            for (const meta of templates) {
                const pct = split[meta.key];
                em.create(Jar, {
                    household: householdId,
                    key: meta.key,
                    name: meta.name,
                    subtitle: meta.subtitle,
                    icon: meta.icon,
                    percentage: typeof pct === 'number' ? `${pct}.00` : meta.percentage,
                    capabilities: { ...meta.capabilities },
                    sortOrder: meta.sortOrder,
                } as never);
            }
        } else {
            const existing = await em.find(Jar, { household: householdId });
            for (const jar of existing) {
                const pct = split[jar.key];
                if (typeof pct === 'number') jar.percentage = `${pct}.00`;
            }
        }

        await em.flush();

        const jars = await em.find(
            Jar,
            { household: householdId },
            { orderBy: { sortOrder: 'ASC' } }
        );
        const jarMap = toJarMap(jars);

        const incomeCount = await em.count(IncomeSource, { household: householdId });
        if (incomeCount === 0) {
            switch (demo.persona) {
                case 'basic':
                    this.seedBasicBoard(
                        em,
                        householdId,
                        rumteloAccount.id,
                        jarMap,
                        demo,
                        demoBanks
                    );
                    break;
                case 'plus':
                    this.seedPlusBoard(em, householdId, rumteloAccount.id, jarMap, demo, demoBanks);
                    break;
                case 'max':
                    this.seedMaxBoard(em, householdId, rumteloAccount.id, jarMap, demo, demoBanks);
                    break;
            }
        }

        await em.flush();

        // Jar-sorted demo rows still need categoryId — otherwise Six Jars shows Uncategorized.
        await this.linkDemoCategories(em, householdId, jars);
        await em.flush();

        if (demo.persona === 'max') {
            const assetCount = await em.count(Asset, { household: householdId });
            if (assetCount === 0) this.seedMaxAssets(em, householdId);
        }

        if (demo.persona === 'plus' || demo.persona === 'max') {
            const learnCount = await em.count(LearnProgress, { household: householdId });
            if (learnCount === 0) {
                this.seedLearn(em, householdId, rumteloAccount.id, demo.persona);
            }
        }

        await em.flush();
    }

    /** Tight paycheck life — small goal, bills eat the month, almost no slack. */
    private seedBasicBoard(
        em: EntityManager,
        householdId: string,
        accountId: string,
        jars: JarMap,
        demo: DemoAccount,
        banks: DemoBanks
    ): void {
        this.createIncome(em, householdId, {
            name: 'Retail salary',
            kind: IncomeKind.SALARY,
            amount: 1_850,
            expectedDay: 25,
        });

        for (const row of [
            { name: 'Rent', amount: 950, dueDay: 1 },
            { name: 'Utilities', amount: 120, dueDay: 8 },
            { name: 'Phone', amount: 35, dueDay: 12 },
            { name: 'Groceries', amount: 280, dueDay: 1 },
            { name: 'Transit pass', amount: 85, dueDay: 1 },
        ] as const) {
            this.createFixed(em, householdId, jars.necessities, row);
        }

        em.create(Goal, {
            household: householdId,
            jar: jars.lts,
            kind: GoalKind.SAVE,
            status: GoalStatus.ACTIVE,
            name: 'Emergency cushion',
            target: toMinorUnits(500),
            saved: toMinorUnits(45),
            monthlyContribution: toMinorUnits(25),
            targetOn: monthsAhead(8),
            why: demo.why,
            icon: '🛟',
            sortOrder: 0,
        } as never);
        // Car fund preset — name is a catalog brand so the goal form shows the marque logo.
        em.create(Goal, {
            household: householdId,
            jar: jars.lts,
            kind: GoalKind.SAVE,
            status: GoalStatus.ACTIVE,
            name: 'Toyota',
            target: toMinorUnits(4_500),
            saved: toMinorUnits(180),
            monthlyContribution: toMinorUnits(75),
            targetOn: monthsAhead(36),
            why: 'Used hatchback — stop borrowing for wheels.',
            icon: '🚗',
            sortOrder: 1,
        } as never);

        const checking = this.createBank(em, householdId, {
            name: 'Checking',
            kind: AccountKind.CHECKING,
            balance: 187.5,
            bank: banks.primary,
        });

        for (const tx of [
            {
                daysAgo: 0,
                amount: -18.9,
                description: 'Corner store',
                counterparty: 'Spar',
                status: TransactionStatus.INBOX,
            },
            {
                daysAgo: 1,
                amount: -42.5,
                description: 'Groceries',
                counterparty: 'Supermarket',
                jar: jars.necessities,
                status: TransactionStatus.SORTED,
            },
            {
                daysAgo: 3,
                amount: -950,
                description: 'Rent',
                counterparty: 'Landlord',
                jar: jars.necessities,
                status: TransactionStatus.SORTED,
            },
            {
                daysAgo: 5,
                amount: -22,
                description: 'Bus top-up',
                counterparty: 'Transit',
                jar: jars.necessities,
                status: TransactionStatus.SORTED,
            },
            {
                daysAgo: 7,
                amount: -14.5,
                description: 'Coffee',
                counterparty: 'Cafe',
                jar: jars.play,
                status: TransactionStatus.SORTED,
            },
            {
                daysAgo: 12,
                amount: 1_850,
                description: 'Salary',
                counterparty: 'Employer',
                jar: jars.necessities,
                status: TransactionStatus.SORTED,
                source: TransactionSource.BANK,
            },
            {
                daysAgo: 14,
                amount: -35,
                description: 'Phone bill',
                counterparty: 'Mobile Co',
                jar: jars.necessities,
                status: TransactionStatus.SORTED,
            },
            {
                daysAgo: 18,
                amount: -68,
                description: 'Pharmacy',
                counterparty: 'Pharmacy',
                jar: jars.necessities,
                status: TransactionStatus.SORTED,
            },
        ] as const) {
            this.createTx(em, householdId, checking, tx);
        }

        this.seedEnergyDays(em, householdId, accountId, [
            { daysAgo: 0, metric: EnergyMetric.SLEEP, value: '48.00', note: 'Short night' },
            { daysAgo: 1, metric: EnergyMetric.SLEEP, value: '52.00' },
            { daysAgo: 2, metric: EnergyMetric.SLEEP, value: '55.00' },
            { daysAgo: 3, metric: EnergyMetric.SLEEP, value: '44.00', note: 'Worried about bills' },
            { daysAgo: 4, metric: EnergyMetric.MIND, value: '40.00' },
            { daysAgo: 5, metric: EnergyMetric.SLEEP, value: '58.00' },
        ]);

        em.create(Gratitude, {
            household: householdId,
            account: accountId,
            week: isoWeekKey(daysAgoDate(2)),
            text: 'Got through the month without overdraft — small win.',
        } as never);

        em.create(IncomeLever, {
            household: householdId,
            name: 'Ask for a small raise',
            note: 'Shift lead opening next quarter — prepare numbers.',
            potentialMonthly: toMinorUnits(120),
            isDone: false,
        } as never);

        em.create(IncomeMilestone, {
            household: householdId,
            name: '€2,000 take-home',
            targetMonthly: toMinorUnits(2_000),
            reachedOn: null,
        } as never);
    }

    /** Freelancer in the rat race — bills + debt absorb variable income. */
    private seedPlusBoard(
        em: EntityManager,
        householdId: string,
        accountId: string,
        jars: JarMap,
        demo: DemoAccount,
        banks: DemoBanks
    ): void {
        this.createIncome(em, householdId, {
            name: 'Client retainers',
            kind: IncomeKind.FREELANCE,
            amount: 2_800,
            expectedDay: 15,
        });
        this.createIncome(em, householdId, {
            name: 'One-off gigs',
            kind: IncomeKind.FREELANCE,
            amount: 650,
            expectedDay: 28,
        });

        for (const row of [
            { name: 'Rent', amount: 1_250, dueDay: 1 },
            { name: 'Health insurance', amount: 155, dueDay: 1 },
            { name: 'Coworking', amount: 220, dueDay: 5 },
            { name: 'Software stack', amount: 89, dueDay: 8 },
            { name: 'Phone + internet', amount: 65, dueDay: 12 },
            { name: 'Groceries', amount: 420, dueDay: 1 },
            { name: 'Car lease', amount: 380, dueDay: 3 },
        ] as const) {
            this.createFixed(em, householdId, jars.necessities, row);
        }

        em.create(Debt, {
            household: householdId,
            name: 'Credit card',
            kind: DebtKind.CREDIT_CARD,
            balance: toMinorUnits(2_850),
            originalBalance: toMinorUnits(3_200),
            interestRate: '19.90',
            minimumPayment: toMinorUnits(180),
            extraPayment: toMinorUnits(0),
            dueDay: 20,
        } as never);
        em.create(Debt, {
            household: householdId,
            name: 'Laptop loan',
            kind: DebtKind.LOAN,
            balance: toMinorUnits(950),
            originalBalance: toMinorUnits(1_800),
            interestRate: '7.50',
            minimumPayment: toMinorUnits(120),
            extraPayment: toMinorUnits(0),
            dueDay: 10,
        } as never);

        em.create(Goal, {
            household: householdId,
            jar: jars.lts,
            kind: GoalKind.SAVE,
            status: GoalStatus.ACTIVE,
            name: 'Emergency fund',
            target: toMinorUnits(6_000),
            saved: toMinorUnits(420),
            monthlyContribution: toMinorUnits(50),
            targetOn: monthsAhead(24),
            why: 'Always resetting after slow months.',
            icon: '🛟',
            sortOrder: 0,
        } as never);
        em.create(Goal, {
            household: householdId,
            jar: jars.lts,
            kind: GoalKind.SAVE,
            status: GoalStatus.ACTIVE,
            name: 'Volkswagen',
            target: toMinorUnits(12_000),
            saved: toMinorUnits(1_850),
            monthlyContribution: toMinorUnits(250),
            targetOn: monthsAhead(30),
            why: 'Family hatch — save the deposit before shopping.',
            icon: '🚗',
            sortOrder: 1,
        } as never);
        em.create(Goal, {
            household: householdId,
            jar: jars.education,
            kind: GoalKind.SAVE,
            status: GoalStatus.PAUSED,
            name: 'Course: product design',
            target: toMinorUnits(1_200),
            saved: toMinorUnits(180),
            monthlyContribution: toMinorUnits(0),
            why: 'Paused — cash went to the card minimum.',
            icon: '📚',
        } as never);
        em.create(Goal, {
            household: householdId,
            jar: null,
            kind: GoalKind.EARN,
            status: GoalStatus.ACTIVE,
            name: '€4k months',
            target: toMinorUnits(4_000),
            saved: toMinorUnits(0),
            monthlyContribution: toMinorUnits(0),
            why: demo.why,
            icon: '📈',
        } as never);

        const checking = this.createBank(em, householdId, {
            name: 'Business checking',
            kind: AccountKind.CHECKING,
            balance: 942,
            bank: banks.primary,
        });
        this.createBank(em, householdId, {
            name: 'Tax set-aside',
            kind: AccountKind.SAVINGS,
            balance: 2_100,
            bank: banks.primary,
        });

        em.create(SortRule, {
            household: householdId,
            field: RuleField.COUNTERPARTY,
            matcher: RuleMatcher.CONTAINS,
            matchValue: 'Adobe',
            jar: jars.necessities,
            priority: 10,
            hitCount: 4,
            isActive: true,
        } as never);
        em.create(SortRule, {
            household: householdId,
            field: RuleField.DESCRIPTION,
            matcher: RuleMatcher.CONTAINS,
            matchValue: 'Uber',
            jar: jars.play,
            priority: 20,
            hitCount: 11,
            isActive: true,
        } as never);

        for (const tx of [
            {
                daysAgo: 0,
                amount: -64,
                description: 'Client dinner',
                counterparty: 'Bistro',
                status: TransactionStatus.INBOX,
            },
            {
                daysAgo: 0,
                amount: -21.5,
                description: 'Uber to pitch',
                counterparty: 'Uber',
                jar: jars.play,
                status: TransactionStatus.SORTED,
                source: TransactionSource.BANK,
            },
            {
                daysAgo: 1,
                amount: 950,
                description: 'Invoice #184 — Acme',
                counterparty: 'Acme BV',
                jar: jars.necessities,
                status: TransactionStatus.SORTED,
                source: TransactionSource.BANK,
            },
            {
                daysAgo: 2,
                amount: -180,
                description: 'Credit card minimum',
                counterparty: 'Visa',
                jar: jars.necessities,
                status: TransactionStatus.SORTED,
            },
            {
                daysAgo: 3,
                amount: -89,
                description: 'Adobe Creative Cloud',
                counterparty: 'Adobe',
                jar: jars.necessities,
                status: TransactionStatus.SORTED,
                source: TransactionSource.RECURRING,
            },
            {
                daysAgo: 4,
                amount: -420,
                description: 'Weekly groceries',
                counterparty: 'Supermarket',
                jar: jars.necessities,
                status: TransactionStatus.SORTED,
            },
            {
                daysAgo: 5,
                amount: -1_250,
                description: 'Rent',
                counterparty: 'Landlord',
                jar: jars.necessities,
                status: TransactionStatus.SORTED,
            },
            {
                daysAgo: 7,
                amount: 1_400,
                description: 'Invoice #183 — Nova',
                counterparty: 'Nova Studio',
                jar: jars.necessities,
                status: TransactionStatus.SORTED,
                source: TransactionSource.BANK,
            },
            {
                daysAgo: 9,
                amount: -380,
                description: 'Car lease',
                counterparty: 'LeaseCo',
                jar: jars.necessities,
                status: TransactionStatus.SORTED,
                source: TransactionSource.RECURRING,
            },
            {
                daysAgo: 11,
                amount: -220,
                description: 'Coworking',
                counterparty: 'WeWork',
                jar: jars.necessities,
                status: TransactionStatus.SORTED,
            },
            {
                daysAgo: 14,
                amount: -48,
                description: 'Takeout after late delivery',
                counterparty: 'Deliveroo',
                jar: jars.play,
                status: TransactionStatus.SORTED,
            },
            {
                daysAgo: 16,
                amount: 450,
                description: 'Rush gig — logo pack',
                counterparty: 'Local Shop',
                jar: jars.necessities,
                status: TransactionStatus.SORTED,
            },
            {
                daysAgo: 20,
                amount: -120,
                description: 'Laptop loan payment',
                counterparty: 'FinCo',
                jar: jars.necessities,
                status: TransactionStatus.SORTED,
            },
        ] as const) {
            this.createTx(em, householdId, checking, tx);
        }

        this.seedEnergyDays(em, householdId, accountId, [
            { daysAgo: 0, metric: EnergyMetric.SLEEP, value: '42.00', note: 'Deadline night' },
            { daysAgo: 0, metric: EnergyMetric.FOOD, value: '38.00', note: 'Skipped lunch' },
            { daysAgo: 1, metric: EnergyMetric.SLEEP, value: '50.00' },
            { daysAgo: 1, metric: EnergyMetric.TRAIN, value: '25.00' },
            { daysAgo: 2, metric: EnergyMetric.SLEEP, value: '48.00' },
            { daysAgo: 2, metric: EnergyMetric.FOOD, value: '55.00' },
            { daysAgo: 3, metric: EnergyMetric.TRAIN, value: '60.00', note: 'Gym — rare win' },
            { daysAgo: 4, metric: EnergyMetric.SLEEP, value: '40.00' },
            { daysAgo: 4, metric: EnergyMetric.MIND, value: '35.00', note: 'Invoice anxiety' },
            { daysAgo: 5, metric: EnergyMetric.FOOD, value: '45.00' },
            { daysAgo: 6, metric: EnergyMetric.SLEEP, value: '55.00' },
        ]);

        for (const [weekOffset, text] of [
            [0, 'Client paid on time — rare calm Tuesday.'],
            [1, 'Finished a proposal before midnight.'],
        ] as const) {
            em.create(Gratitude, {
                household: householdId,
                account: accountId,
                week: isoWeekKey(daysAgoDate(weekOffset * 7)),
                text,
            } as never);
        }

        em.create(IncomeLever, {
            household: householdId,
            name: 'Raise retainer rates 15%',
            note: 'Two clients renewing next month.',
            potentialMonthly: toMinorUnits(350),
            isDone: false,
        } as never);
        em.create(IncomeLever, {
            household: householdId,
            name: 'Drop lowest-value client',
            note: 'Frees 6h/week for higher-rate work.',
            potentialMonthly: toMinorUnits(200),
            isDone: true,
        } as never);
        em.create(IncomeLever, {
            household: householdId,
            name: 'Productize a template pack',
            note: 'Passive add-on once, sell many times.',
            potentialMonthly: toMinorUnits(400),
            isDone: false,
        } as never);

        em.create(IncomeMilestone, {
            household: householdId,
            name: '€3,000 months',
            targetMonthly: toMinorUnits(3_000),
            reachedOn: monthsAgo(2),
        } as never);
        em.create(IncomeMilestone, {
            household: householdId,
            name: '€4,000 months',
            targetMonthly: toMinorUnits(4_000),
            reachedOn: null,
        } as never);
    }

    /** Investor / operator — profits, portfolio accounts, large goals, healthy rhythm. */
    /** A shelf that already has titles, so Learn is not empty on the demo accounts. */
    private seedLearn(
        em: EntityManager,
        householdId: string,
        accountId: string,
        persona: 'plus' | 'max'
    ): void {
        const rows =
            persona === 'plus'
                ? [
                      {
                          pieceKey: 'psychology-of-money',
                          skill: 'MONEY',
                          status: LearnProgressStatus.NOW,
                          rank: 1,
                          dueOn: monthsAhead(1),
                      },
                      {
                          pieceKey: 'rich-dad',
                          skill: 'MONEY',
                          status: LearnProgressStatus.QUEUE,
                          rank: 2,
                          dueOn: null,
                      },
                      {
                          pieceKey: 'profit-first',
                          skill: 'MONEY',
                          status: LearnProgressStatus.QUEUE,
                          rank: 3,
                          dueOn: null,
                      },
                      {
                          pieceKey: 'the-founder',
                          skill: 'MONEY',
                          status: LearnProgressStatus.QUEUE,
                          rank: 4,
                          dueOn: null,
                      },
                  ]
                : [
                      {
                          pieceKey: 'profit-first',
                          skill: 'MONEY',
                          status: LearnProgressStatus.NOW,
                          rank: 1,
                          dueOn: monthsAhead(2),
                      },
                      {
                          pieceKey: 'extreme-ownership',
                          skill: 'LEADERSHIP',
                          status: LearnProgressStatus.NOW,
                          rank: 2,
                          dueOn: monthsAhead(3),
                      },
                      {
                          pieceKey: 'buy-back-your-time',
                          skill: 'MONEY',
                          status: LearnProgressStatus.QUEUE,
                          rank: 3,
                          dueOn: null,
                      },
                      {
                          pieceKey: '100m-offers',
                          skill: 'MONEY',
                          status: LearnProgressStatus.QUEUE,
                          rank: 4,
                          dueOn: null,
                      },
                      {
                          pieceKey: 'psychology-of-money',
                          skill: 'MONEY',
                          status: LearnProgressStatus.DONE,
                          rank: 5,
                          dueOn: null,
                      },
                      {
                          pieceKey: 'succession',
                          skill: 'LEADERSHIP',
                          status: LearnProgressStatus.QUEUE,
                          rank: 6,
                          dueOn: null,
                      },
                  ];

        for (const row of rows) {
            em.create(LearnProgress, {
                household: householdId,
                account: accountId,
                pieceKey: row.pieceKey,
                skill: row.skill,
                status: row.status,
                rank: row.rank,
                dueOn: row.dueOn,
            } as never);
        }

        const skills = persona === 'plus' ? ['MONEY'] : ['MONEY', 'LEADERSHIP'];
        for (const skill of skills) {
            em.create(LearnSkillFocus, {
                household: householdId,
                account: accountId,
                skill,
            } as never);
        }
    }

    /** Ownership for the Max household — a studio, a portfolio, a home, a rental. */
    private seedMaxAssets(em: EntityManager, householdId: string): void {
        for (const row of [
            {
                name: 'The company',
                kindKey: 'BUSINESS',
                presetKey: 'COMPANY',
                value: 220_000,
                flow: 5_200,
            },
            {
                name: 'Dividend portfolio',
                kindKey: 'PORTFOLIO',
                presetKey: 'DIVIDEND_PORTFOLIO',
                value: 124_800,
                flow: 950,
            },
            {
                name: 'Rental property',
                kindKey: 'PROPERTY',
                presetKey: 'RENTAL',
                value: 336_000,
                flow: 1_400,
            },
            { name: 'Home', kindKey: 'PROPERTY', presetKey: 'HOME', value: 410_000, flow: 0 },
            {
                name: 'Private pension',
                kindKey: 'PENSION',
                presetKey: 'PRIVATE_PENSION',
                value: 86_000,
                flow: 0,
            },
            { name: 'Car', kindKey: 'VEHICLE', presetKey: 'CAR', value: 28_000, flow: 0 },
        ] as const) {
            em.create(Asset, {
                household: householdId,
                name: row.name,
                kindKey: row.kindKey,
                presetKey: row.presetKey,
                value: toMinorUnits(row.value),
                flow: toMinorUnits(row.flow),
            } as never);
        }
    }

    private seedMaxBoard(
        em: EntityManager,
        householdId: string,
        accountId: string,
        jars: JarMap,
        demo: DemoAccount,
        banks: DemoBanks
    ): void {
        this.createIncome(em, householdId, {
            name: 'Studio profit draw',
            kind: IncomeKind.OTHER,
            amount: 5_200,
            expectedDay: 1,
        });
        this.createIncome(em, householdId, {
            name: 'Dividend portfolio',
            kind: IncomeKind.DIVIDEND,
            amount: 950,
            expectedDay: 15,
        });
        this.createIncome(em, householdId, {
            name: 'Rental unit',
            kind: IncomeKind.RENTAL,
            amount: 1_400,
            expectedDay: 1,
        });

        for (const row of [
            { name: 'Mortgage', amount: 1_850, dueDay: 1, jar: jars.necessities },
            { name: 'Property tax escrow', amount: 220, dueDay: 1, jar: jars.necessities },
            { name: 'Health + life insurance', amount: 280, dueDay: 5, jar: jars.necessities },
            { name: 'Groceries', amount: 550, dueDay: 1, jar: jars.necessities },
            { name: 'Brokerage fees', amount: 45, dueDay: 28, jar: jars.ff },
            { name: 'Learning subscriptions', amount: 79, dueDay: 10, jar: jars.education },
            {
                name: 'Charitable giving',
                amount: 250,
                dueDay: 1,
                jar: jars.give,
                counterparty: DEMO_GIVE_COUNTERPARTY,
            },
        ] as const) {
            this.createFixed(em, householdId, row.jar, {
                name: row.name,
                amount: row.amount,
                dueDay: row.dueDay,
                counterparty: 'counterparty' in row ? row.counterparty : undefined,
            });
        }

        em.create(Debt, {
            household: householdId,
            name: 'Home mortgage',
            kind: DebtKind.MORTGAGE,
            balance: toMinorUnits(248_000),
            originalBalance: toMinorUnits(320_000),
            interestRate: '3.40',
            minimumPayment: toMinorUnits(1_850),
            extraPayment: toMinorUnits(500),
            dueDay: 1,
        } as never);
        // High rate, medium balance — Avalanche hits this first.
        em.create(Debt, {
            household: householdId,
            name: 'Credit card',
            kind: DebtKind.CREDIT_CARD,
            balance: toMinorUnits(6_800),
            originalBalance: toMinorUnits(9_000),
            interestRate: '18.90',
            minimumPayment: toMinorUnits(220),
            extraPayment: toMinorUnits(300),
            dueDay: 22,
        } as never);
        // Smallest balance, lower rate — Snowball hits this first (≠ Avalanche).
        em.create(Debt, {
            household: householdId,
            name: 'Business credit line',
            kind: DebtKind.LOAN,
            balance: toMinorUnits(4_200),
            originalBalance: toMinorUnits(15_000),
            interestRate: '5.20',
            minimumPayment: toMinorUnits(250),
            extraPayment: toMinorUnits(450),
            dueDay: 15,
        } as never);

        em.create(Goal, {
            household: householdId,
            jar: jars.ff,
            kind: GoalKind.SAVE,
            status: GoalStatus.ACTIVE,
            name: 'Financial Freedom buffer',
            target: toMinorUnits(50_000),
            saved: toMinorUnits(18_500),
            monthlyContribution: toMinorUnits(1_200),
            targetOn: monthsAhead(28),
            why: demo.why,
            icon: '🏦',
        } as never);
        em.create(Goal, {
            household: householdId,
            jar: jars.lts,
            kind: GoalKind.SAVE,
            status: GoalStatus.ACTIVE,
            name: 'Second property deposit',
            target: toMinorUnits(25_000),
            saved: toMinorUnits(9_800),
            monthlyContribution: toMinorUnits(600),
            targetOn: monthsAhead(18),
            why: 'Cash-flowing rental next door to current unit.',
            icon: '🏠',
            sortOrder: 0,
        } as never);
        em.create(Goal, {
            household: householdId,
            jar: jars.lts,
            kind: GoalKind.SAVE,
            status: GoalStatus.ACTIVE,
            name: 'Tesla',
            target: toMinorUnits(18_000),
            saved: toMinorUnits(4_200),
            monthlyContribution: toMinorUnits(500),
            targetOn: monthsAhead(24),
            why: 'Upgrade from the current car — pay cash, not lease.',
            icon: '🚗',
            sortOrder: 1,
        } as never);
        em.create(Goal, {
            household: householdId,
            jar: jars.education,
            kind: GoalKind.SAVE,
            status: GoalStatus.ACTIVE,
            name: 'Executive leadership program',
            target: toMinorUnits(3_500),
            saved: toMinorUnits(2_100),
            monthlyContribution: toMinorUnits(200),
            targetOn: monthsAhead(6),
            icon: '🎓',
        } as never);
        // GIVE pledge: `saved` is recomputed from Give-jar transactions on read.
        em.create(Goal, {
            household: householdId,
            jar: jars.give,
            kind: GoalKind.GIVE,
            status: GoalStatus.ACTIVE,
            name: 'Annual give pledge',
            target: toMinorUnits(3_000),
            saved: toMinorUnits(0),
            monthlyContribution: toMinorUnits(250),
            targetOn: `${new Date().getUTCFullYear()}-12-31`,
            why: 'A fixed share leaves before I can hold on to it.',
            icon: '💛',
        } as never);
        em.create(Goal, {
            household: householdId,
            jar: null,
            kind: GoalKind.EARN,
            status: GoalStatus.ACTIVE,
            name: '€10k passive / month',
            target: toMinorUnits(10_000),
            saved: toMinorUnits(0),
            monthlyContribution: toMinorUnits(0),
            why: 'Dividends + rent covering lifestyle floor.',
            icon: '📊',
        } as never);

        const checking = this.createBank(em, householdId, {
            name: 'Operating checking',
            kind: AccountKind.CHECKING,
            balance: 12_400,
            bank: banks.primary,
            isPrimary: true,
        });
        this.createBank(em, householdId, {
            name: 'High-yield savings',
            kind: AccountKind.SAVINGS,
            balance: 36_500,
            bank: banks.primary,
        });
        const brokerage = this.createBank(em, householdId, {
            name: 'Brokerage',
            kind: AccountKind.INVESTMENT,
            balance: 124_800,
            bank: banks.secondary,
        });

        em.create(SortRule, {
            household: householdId,
            field: RuleField.COUNTERPARTY,
            matcher: RuleMatcher.CONTAINS,
            matchValue: 'Vanguard',
            jar: jars.ff,
            priority: 5,
            hitCount: 22,
            isActive: true,
        } as never);
        em.create(SortRule, {
            household: householdId,
            field: RuleField.DESCRIPTION,
            matcher: RuleMatcher.CONTAINS,
            matchValue: 'Dividend',
            jar: jars.ff,
            priority: 5,
            hitCount: 18,
            isActive: true,
        } as never);
        em.create(SortRule, {
            household: householdId,
            field: RuleField.COUNTERPARTY,
            matcher: RuleMatcher.CONTAINS,
            matchValue: 'Whole Foods',
            jar: jars.necessities,
            priority: 30,
            hitCount: 9,
            isActive: true,
        } as never);

        for (const tx of [
            {
                daysAgo: 0,
                amount: 325,
                description: 'Dividend — VT',
                counterparty: 'Vanguard',
                jar: jars.ff,
                status: TransactionStatus.SORTED,
                source: TransactionSource.BANK,
                account: brokerage,
            },
            {
                daysAgo: 0,
                amount: -184,
                description: 'Date night',
                counterparty: 'Restaurant',
                status: TransactionStatus.INBOX,
            },
            {
                daysAgo: 1,
                amount: -1_200,
                description: 'Brokerage transfer → VT',
                counterparty: 'Vanguard',
                jar: jars.ff,
                status: TransactionStatus.SORTED,
                source: TransactionSource.BANK,
            },
            {
                daysAgo: 2,
                amount: 1_400,
                description: 'Rental income',
                counterparty: 'Tenant',
                jar: jars.ff,
                status: TransactionStatus.SORTED,
                source: TransactionSource.BANK,
            },
            {
                daysAgo: 3,
                amount: -1_850,
                description: 'Mortgage + extra principal',
                counterparty: 'Bank NL',
                jar: jars.necessities,
                status: TransactionStatus.SORTED,
                source: TransactionSource.RECURRING,
            },
            {
                daysAgo: 4,
                amount: 5_200,
                description: 'Studio profit draw',
                counterparty: 'Studio BV',
                jar: jars.necessities,
                status: TransactionStatus.SORTED,
                source: TransactionSource.BANK,
            },
            {
                daysAgo: 5,
                amount: -250,
                description: 'Monthly give',
                counterparty: DEMO_GIVE_COUNTERPARTY,
                jar: jars.give,
                status: TransactionStatus.SORTED,
                source: TransactionSource.RECURRING,
            },
            {
                daysAgo: 35,
                amount: -250,
                description: 'Monthly give',
                counterparty: DEMO_GIVE_COUNTERPARTY,
                jar: jars.give,
                status: TransactionStatus.SORTED,
                source: TransactionSource.RECURRING,
            },
            {
                daysAgo: 66,
                amount: -250,
                description: 'Monthly give',
                counterparty: DEMO_GIVE_COUNTERPARTY,
                jar: jars.give,
                status: TransactionStatus.SORTED,
                source: TransactionSource.RECURRING,
            },
            {
                daysAgo: 96,
                amount: -250,
                description: 'Monthly give',
                counterparty: DEMO_GIVE_COUNTERPARTY,
                jar: jars.give,
                status: TransactionStatus.SORTED,
                source: TransactionSource.RECURRING,
            },
            {
                daysAgo: 48,
                amount: -400,
                description: 'Emergency appeal',
                counterparty: 'Giro555',
                jar: jars.give,
                status: TransactionStatus.SORTED,
            },
            {
                daysAgo: 6,
                amount: -79,
                description: 'Masterclass membership',
                counterparty: 'LearnCo',
                jar: jars.education,
                status: TransactionStatus.SORTED,
                source: TransactionSource.RECURRING,
            },
            {
                daysAgo: 8,
                amount: -620,
                description: 'Groceries + household',
                counterparty: 'Whole Foods',
                jar: jars.necessities,
                status: TransactionStatus.SORTED,
            },
            {
                daysAgo: 10,
                amount: -450,
                description: 'Weekend trip',
                counterparty: 'Airbnb',
                jar: jars.play,
                status: TransactionStatus.SORTED,
            },
            {
                daysAgo: 12,
                amount: 280,
                description: 'Dividend — VXUS',
                counterparty: 'Vanguard',
                jar: jars.ff,
                status: TransactionStatus.SORTED,
                source: TransactionSource.BANK,
                account: brokerage,
            },
            {
                daysAgo: 15,
                amount: -1_000,
                description: 'Business credit line extra',
                counterparty: 'BizBank',
                jar: jars.ff,
                status: TransactionStatus.SORTED,
            },
            {
                daysAgo: 18,
                amount: -125,
                description: 'Books + course materials',
                counterparty: 'Bookstore',
                jar: jars.education,
                status: TransactionStatus.SORTED,
            },
            {
                daysAgo: 22,
                amount: 950,
                description: 'Quarterly dividend sweep',
                counterparty: 'Broker',
                jar: jars.ff,
                status: TransactionStatus.SORTED,
                source: TransactionSource.BANK,
            },
        ] as const) {
            this.createTx(em, householdId, tx.account ?? checking, tx);
        }

        this.seedEnergyDays(em, householdId, accountId, [
            { daysAgo: 0, metric: EnergyMetric.SLEEP, value: '78.00' },
            { daysAgo: 0, metric: EnergyMetric.TRAIN, value: '72.00', note: 'Morning run' },
            { daysAgo: 0, metric: EnergyMetric.FOOD, value: '80.00' },
            { daysAgo: 0, metric: EnergyMetric.MIND, value: '75.00' },
            { daysAgo: 1, metric: EnergyMetric.SLEEP, value: '82.00' },
            { daysAgo: 1, metric: EnergyMetric.TRAIN, value: '65.00' },
            { daysAgo: 1, metric: EnergyMetric.FOOD, value: '78.00' },
            { daysAgo: 2, metric: EnergyMetric.SLEEP, value: '76.00' },
            { daysAgo: 2, metric: EnergyMetric.MIND, value: '80.00', note: 'Deep work block' },
            { daysAgo: 3, metric: EnergyMetric.TRAIN, value: '70.00' },
            { daysAgo: 3, metric: EnergyMetric.FOOD, value: '74.00' },
            { daysAgo: 4, metric: EnergyMetric.SLEEP, value: '80.00' },
            { daysAgo: 5, metric: EnergyMetric.TRAIN, value: '68.00' },
            { daysAgo: 5, metric: EnergyMetric.MIND, value: '77.00' },
            { daysAgo: 6, metric: EnergyMetric.SLEEP, value: '85.00' },
            { daysAgo: 6, metric: EnergyMetric.FOOD, value: '82.00' },
        ]);

        for (const [weekOffset, text] of [
            [0, 'Reinvested the rental surplus without second-guessing.'],
            [1, 'Partner and I aligned on the next property criteria.'],
            [2, 'Hit the monthly FF transfer on the first try.'],
        ] as const) {
            em.create(Gratitude, {
                household: householdId,
                account: accountId,
                week: isoWeekKey(daysAgoDate(weekOffset * 7)),
                text,
            } as never);
        }

        em.create(IncomeLever, {
            household: householdId,
            name: 'Raise studio day rate',
            note: 'Already at capacity — price is the lever.',
            potentialMonthly: toMinorUnits(800),
            isDone: true,
        } as never);
        em.create(IncomeLever, {
            household: householdId,
            name: 'Add second rental unit',
            note: 'Underwriting done; deposit goal at 39%.',
            potentialMonthly: toMinorUnits(1_400),
            isDone: false,
        } as never);
        em.create(IncomeLever, {
            household: householdId,
            name: 'Dividend reinvest (DRIP) on',
            note: 'Compounding quietly in brokerage.',
            potentialMonthly: toMinorUnits(120),
            isDone: true,
        } as never);
        em.create(IncomeLever, {
            household: householdId,
            name: 'Productize studio playbooks',
            note: 'Sell internal SOPs as a digital product.',
            potentialMonthly: toMinorUnits(550),
            isDone: false,
        } as never);

        em.create(IncomeMilestone, {
            household: householdId,
            name: '€5k months',
            targetMonthly: toMinorUnits(5_000),
            reachedOn: monthsAgo(14),
        } as never);
        em.create(IncomeMilestone, {
            household: householdId,
            name: '€7.5k months',
            targetMonthly: toMinorUnits(7_500),
            reachedOn: monthsAgo(4),
        } as never);
        em.create(IncomeMilestone, {
            household: householdId,
            name: '€10k months',
            targetMonthly: toMinorUnits(10_000),
            reachedOn: null,
        } as never);
    }

    private createIncome(
        em: EntityManager,
        householdId: string,
        input: { name: string; kind: IncomeKind; amount: number; expectedDay: number }
    ): void {
        const startedOn = monthsAgo(6);
        const amount = toMinorUnits(input.amount);
        const source = em.create(IncomeSource, {
            household: householdId,
            name: input.name,
            kind: input.kind,
            amount,
            expectedDay: input.expectedDay,
            isActive: true,
            cadence: Cadence.MONTHLY,
            startedOn,
        } as never);
        em.create(IncomeAmountPeriod, {
            household: householdId,
            incomeSource: source,
            amount,
            effectiveOn: startedOn,
        } as never);
    }

    private createFixed(
        em: EntityManager,
        householdId: string,
        jar: Jar,
        input: { name: string; amount: number; dueDay: number; counterparty?: string }
    ): void {
        em.create(FixedCost, {
            household: householdId,
            name: input.name,
            counterparty: input.counterparty ?? null,
            amount: toMinorUnits(input.amount),
            dueDay: input.dueDay,
            isActive: true,
            jar,
            cadence: Cadence.MONTHLY,
            direction: FlowDirection.OUT,
        } as never);
    }

    private createBank(
        em: EntityManager,
        householdId: string,
        input: {
            name: string;
            kind: AccountKind;
            balance: number;
            bank: Bank;
            isPrimary?: boolean;
        }
    ): BankAccount {
        const account = em.create(BankAccount, {
            household: householdId,
            name: input.name,
            kind: input.kind,
            balance: toMinorUnits(input.balance),
            bank: input.bank,
            isPrimary: input.isPrimary ?? false,
        } as never);
        em.persist(account);
        return account;
    }

    private createTx(
        em: EntityManager,
        householdId: string,
        defaultAccount: BankAccount,
        input: {
            daysAgo: number;
            amount: number;
            description: string;
            counterparty?: string;
            jar?: Jar;
            status: TransactionStatus;
            source?: TransactionSource;
            account?: BankAccount;
        }
    ): void {
        em.create(Transaction, {
            household: householdId,
            account: input.account ?? defaultAccount,
            jar: input.jar ?? null,
            amount: toMinorUnits(input.amount),
            bookedOn: isoDate(daysAgoDate(input.daysAgo)),
            description: input.description,
            counterparty: input.counterparty ?? null,
            status: input.status,
            source: input.source ?? TransactionSource.MANUAL,
        } as never);
    }

    private seedEnergyDays(
        em: EntityManager,
        householdId: string,
        accountId: string,
        rows: readonly {
            daysAgo: number;
            metric: EnergyMetric;
            value: string;
            note?: string;
        }[]
    ): void {
        for (const row of rows) {
            em.create(EnergyLog, {
                household: householdId,
                account: accountId,
                metric: row.metric,
                value: row.value,
                loggedOn: isoDate(daysAgoDate(row.daysAgo)),
                note: row.note ?? null,
            } as never);
        }
    }

    /**
     * Copy category templates into the household and attach them to demo fixed
     * costs / transactions (catalog presets + demo name hints).
     * Without this, jar-sorted rows stay categoryId=null → UI "Uncategorized".
     */
    private async linkDemoCategories(
        em: EntityManager,
        householdId: string,
        jars: Jar[]
    ): Promise<void> {
        const templates = await em.find(
            CategoryTemplate,
            { isActive: true },
            { populate: ['jarTemplate'] }
        );
        if (templates.length === 0) return;

        const jarByKey = new Map(jars.map(jar => [jar.key, jar]));
        const existing = await em.find(Category, { household: householdId }, { populate: ['jar'] });
        const categoryByJarName = new Map(
            existing.map(category => [
                `${category.jar.id}::${category.name.toLowerCase()}`,
                category,
            ])
        );

        const ensureCategory = (jar: Jar, name: string, sortOrder = 0): Category => {
            const key = `${jar.id}::${name.toLowerCase()}`;
            const found = categoryByJarName.get(key);
            if (found) return found;
            const category = em.create(Category, {
                household: householdId,
                jar,
                name,
                budgeted: 0,
                sortOrder,
            } as never);
            em.persist(category);
            categoryByJarName.set(key, category);
            return category;
        };

        for (const template of templates) {
            const jar = jarByKey.get(template.jarTemplate.key);
            if (!jar) continue;
            ensureCategory(jar, template.name, template.sortOrder);
        }
        await em.flush();

        const resolveCategory = (jar: Jar, categoryName: string): Category | null => {
            const existingCategory = categoryByJarName.get(
                `${jar.id}::${categoryName.toLowerCase()}`
            );
            if (existingCategory) return existingCategory;
            // Demo jar may differ from catalog default (e.g. Uber on Play) — still tag it.
            return ensureCategory(jar, categoryName);
        };

        const fixedPresets = await em.find(
            FixedCostPreset,
            { isActive: true },
            { populate: ['categoryTemplate', 'jarTemplate'] }
        );

        const uncategorizedFixed = await em.find(
            FixedCost,
            { household: householdId, category: null, isActive: true },
            { populate: ['jar'] }
        );
        for (const row of uncategorizedFixed) {
            const hinted = DEMO_FIXED_CATEGORY[row.name];
            if (hinted) {
                row.category = resolveCategory(row.jar, hinted);
                continue;
            }

            const needle = row.name.toLowerCase();
            const matches = fixedPresets
                .filter(preset => {
                    const presetName = preset.name.toLowerCase();
                    return (
                        presetName === needle ||
                        presetName.includes(needle) ||
                        needle.includes(presetName)
                    );
                })
                .sort((left, right) => right.name.length - left.name.length);

            const sameJar = matches.find(preset => preset.jarTemplate.key === row.jar.key);
            const preset = sameJar ?? matches[0];
            if (!preset?.categoryTemplate) continue;
            row.category = resolveCategory(row.jar, preset.categoryTemplate.name);
        }

        const merchants = await em.find(
            MerchantPreset,
            { isActive: true },
            { populate: ['categoryTemplate', 'jarTemplate', 'matching'] }
        );
        const needles: Array<{ needle: string; merchant: MerchantPreset }> = [];
        for (const merchant of merchants) {
            const matching = merchant.matching;
            if (!matching) continue;
            needles.push({ needle: matching.matchValue.toLowerCase(), merchant });
            for (const alias of matching.aliases ?? []) {
                if (alias.trim()) needles.push({ needle: alias.toLowerCase(), merchant });
            }
        }
        needles.sort((left, right) => right.needle.length - left.needle.length);

        const uncategorizedTxs = await em.find(
            Transaction,
            { household: householdId, category: null, jar: { $ne: null } },
            { populate: ['jar'] }
        );
        for (const tx of uncategorizedTxs) {
            if (!tx.jar) continue;
            const haystack = `${tx.counterparty ?? ''} ${tx.description ?? ''}`.toLowerCase();

            const hit = needles.find(entry => haystack.includes(entry.needle));
            const merchantCategory = hit?.merchant.categoryTemplate;
            if (merchantCategory) {
                tx.category = resolveCategory(tx.jar, merchantCategory.name);
                continue;
            }

            const hint = DEMO_TX_CATEGORY.find(entry => haystack.includes(entry.includes));
            if (hint) tx.category = resolveCategory(tx.jar, hint.category);
        }

        await em.flush();
    }

    /** Hash + upsert Better Auth credential so demo passwords stay in sync on re-seed. */
    private async ensureDemoPassword(
        auth: ReturnType<typeof createAuth>,
        userId: string,
        password: string
    ): Promise<void> {
        const ctx = await auth.$context;
        const passwordHash = await ctx.password.hash(password);
        const credential = await ctx.internalAdapter.findCredentialAccount(userId);
        if (credential) {
            await ctx.internalAdapter.updateAccount(credential.id, { password: passwordHash });
            return;
        }
        await ctx.internalAdapter.linkAccount({
            userId,
            providerId: 'credential',
            // Matches better-auth createLocalAccountIssuer('credential')
            issuer: 'local:credential',
            accountId: userId,
            password: passwordHash,
        });
    }
}

function toJarMap(jars: Jar[]): JarMap {
    const byKey = (key: string) => jars.find(j => j.key === key) ?? jars[0]!;
    return {
        necessities: byKey('NECESSITIES'),
        ff: byKey('FINANCIAL_FREEDOM'),
        education: byKey('EDUCATION'),
        lts: byKey('LONG_TERM_SAVINGS'),
        play: byKey('PLAY'),
        give: byKey('GIVE'),
        all: jars,
    };
}

function authUuid(): string {
    return uuidv7();
}

function daysAgoDate(days: number): Date {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - days);
    return date;
}

function isoDate(date: Date): string {
    return date.toISOString().slice(0, 10);
}

function monthsAgo(months: number): string {
    const date = new Date();
    date.setUTCMonth(date.getUTCMonth() - months);
    return isoDate(date);
}

function monthsAhead(months: number): string {
    const date = new Date();
    date.setUTCMonth(date.getUTCMonth() + months);
    return isoDate(date);
}

function isoWeekKey(date: Date): string {
    const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = target.getUTCDay() || 7;
    target.setUTCDate(target.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((target.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
    return `${target.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}
