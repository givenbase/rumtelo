import { LockMode } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import {
    Inject,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';

import {
    type Jar as ContractJar,
    type Cadence,
    type JarKey,
    isMainJarKey,
    jarCapabilitiesFor,
    mainJarKeyFor,
} from '@rumtelo/contracts';
import {
    categoryEnvelope,
    currentYearMonth,
    endOfPeriodIso,
    fixedCostAppliesAsOf,
    jarCoverage,
    jarPotBalance,
    monthlyAmount,
    monthlyNetAsOf,
    scaleJarsForHorizon,
    toPeriodKey,
    travelForPeriod,
} from '@rumtelo/utils';

import { HouseholdScopedRepository } from '../../../../../../common/household/household-scoped.repository';
import { currentHouseholdId } from '../../../../../../common/household/household.context';
import { apiBadRequest } from '../../../../../../common/errors/api-user-error';
import { parseUniqueConstraint } from '../../../../../../common/utils/database-constraint-error.util';
import {
    resolveJarSplit,
    type JarShare as JarSplitShare,
} from '../../../../../../common/utils/jar-split.util';
import { AuthHousehold } from '../../../../../auth/household/managed/household/auth-household.entity';
import { AccountSettingsService } from '../../../../../auth/user/account/account-settings';
import {
    catalogLocaleFromContracts,
    ENTITY_CATEGORY_TEMPLATE,
    ENTITY_JAR_TEMPLATE,
    isCatalogSourceLocale,
    TranslationService,
} from '../../../../../backoffice/admin/translation';
import { CATEGORY_TEMPLATE_SEED } from '../../../../../backoffice/product/money/template/category/seed/category.seed-data';
import { JarTemplateService } from '../../../../../backoffice/product/money/template/jar/jar.service';
import { JAR_TEMPLATE_SEED } from '../../../../../backoffice/product/money/template/jar/seed/jar.seed-data';
import { BankAccount } from '../../ledger/bank-account/bank-account.entity';
import { SortRule } from '../../ledger/sort-rule/sort-rule.entity';
import { Transaction } from '../../ledger/transaction/transaction.entity';
import { Goal } from '../../targets/goal/goal.entity';
import { WeekCheckAllocation } from '../../week-check/week-check-allocation.entity';
import { FixedCost } from '../fixed-cost/fixed-cost.entity';
import { Category } from './category.entity';
import {
    incomeChangePeriods,
    toIncomeSources,
    type IncomeAmountPeriodRow,
    type IncomeSourceRow,
} from './income-history.util';
import { Jar } from './jar.entity';
import { JAR_SHARE_BASELINE_PERIOD, JarShare } from './jar-share.entity';
import {
    allocateMonth,
    cumulativeDepositsByPot,
    fromBasisPoints,
    mergeShareHistories,
    healedShareHistory,
    potShareHistory,
    shareBasisPointsAt,
    toBasisPoints,
} from './jar-share.util';

/**
 * The contract is the source of truth for wire shapes; deriving the DTO from it
 * means a schema change breaks this file rather than silently shipping a mismatch.
 */
export type JarDto = ContractJar;

@Injectable()
export class JarService {
    private readonly jars: HouseholdScopedRepository<Jar>;
    private readonly categories: HouseholdScopedRepository<Category>;

    constructor(
        @Inject(EntityManager) private readonly em: EntityManager,
        @Inject(TranslationService) private readonly translations: TranslationService,
        @Inject(AccountSettingsService) private readonly accountSettings: AccountSettingsService,
        @Inject(JarTemplateService) private readonly jarTemplates: JarTemplateService
    ) {
        this.jars = new HouseholdScopedRepository(em, Jar);
        this.categories = new HouseholdScopedRepository(em, Category);
    }

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    /**
     * Turn on an optional pot (DAILY, GOALS, FINANCIAL_FREEDOM, EDUCATION, GIVE). Its share
     * (the template percentage) comes OUT OF the group's main pot, so the group total and the
     * household total (exactly 100.00) do not change. The new pot sits on the same bank seat
     * as the main pot.
     *
     * One transaction that first locks every jar of the household (`lockHouseholdJars`, the
     * same lock `deactivate` and `updateSplit` take): two writers would otherwise both read old
     * percentages and the second write would silently undo the first (the total would drift
     * from 100). A double activation of the
     * same key ends as `jar_already_active`, never a 500 (the unique household + key index is
     * the last line of defence). Maths is in basis points (0.01 %).
     *
     * Errors: `jar_not_optional` (a main key), `jar_already_active`, `jar_share_too_small`
     * (the main pot would be left with nothing).
     */
    async activate(key: JarKey): Promise<JarDto> {
        if (isMainJarKey(key)) throw apiBadRequest('jar_not_optional');
        const template = await this.jarTemplates.findActive(key);
        const shareBasisPoints = template ? toBasisPoints(template.percentage) : 0;
        // A missing template or a share of 0 is a catalog setup error, not the household's
        // doing: one exception type, carrying only the key.
        if (!template || shareBasisPoints <= 0) {
            throw new InternalServerErrorException(`Jar template for ${key} is not set up`);
        }
        const mainKey = mainJarKeyFor(key);

        try {
            const created = await this.em.transactional(async tx => {
                const scoped = new HouseholdScopedRepository(tx, Jar);
                const jars = await this.lockHouseholdJars(tx);
                const main = jars.find(jar => jar.key === mainKey);
                if (!main) throw new NotFoundException(`Household has no ${mainKey} pot`);
                if (jars.some(jar => jar.key === key)) throw apiBadRequest('jar_already_active');

                const mainBasisPoints = toBasisPoints(main.percentage);
                if (mainBasisPoints - shareBasisPoints <= 0) {
                    throw apiBadRequest('jar_share_too_small');
                }
                // Bring the history in line with the pots as they are now (old-backend drift)
                // before this change builds on it.
                const shares = await this.loadShares(tx);
                this.reconcileHistory(tx, shares, jars);
                main.percentage = fromBasisPoints(mainBasisPoints - shareBasisPoints);

                const jar = scoped.create({
                    key,
                    name: template.name,
                    subtitle: template.subtitle,
                    icon: template.icon,
                    percentage: fromBasisPoints(shareBasisPoints),
                    capabilities: { ...template.capabilities },
                    sortOrder: template.sortOrder,
                    defaultAccount: main.defaultAccount,
                } as never);
                tx.persist(jar);

                // History: the main pot gives up its share from this month on and the new pot
                // starts now, so no earlier month is re-priced.
                const period = currentPeriodKey();
                this.writeShare(tx, shares, main, period, main.percentage);
                this.writeShare(tx, shares, jar, period, jar.percentage);

                // The household still totals exactly 100.00 (same rule as `updateSplit`).
                const after = [...jars, jar].map(row => ({
                    key: row.key,
                    sortOrder: row.sortOrder,
                    percentage: row.percentage,
                }));
                resolveJarSplit(
                    after,
                    after.map(row => ({ key: row.key, percentage: Number(row.percentage) }))
                );
                return jar;
            });
            const [dto] = await this.applyJarTranslations([toJarDto(created)]);
            return dto!;
        } catch (error) {
            if (parseUniqueConstraint(error)) throw apiBadRequest('jar_already_active');
            throw error;
        }
    }

    /**
     * UNIQUE(household, jar, name) — re-creating a name that exists (usually
     * archived) revives that row so its history stays attached, rather than 500ing.
     */
    async createCategory(jarId: string, name: string, budgeted: number) {
        const jar = await this.jars.findOneOrFail({ id: jarId });
        const trimmed = name.trim();
        let cat = await this.categories.findOne({ jar: jar.id, name: trimmed });
        if (cat) {
            cat.isArchived = false;
            cat.budgeted = budgeted;
        } else {
            cat = this.em.create(Category, {
                household: currentHouseholdId(),
                jar,
                name: trimmed,
                budgeted,
            } as never);
            this.em.persist(cat);
        }
        await this.em.flush();
        return {
            id: cat.id,
            jarId: jar.id,
            name: cat.name,
            budgeted: cat.budgeted,
            /** Period actual only exists on JarBalance — CRUD has no period. */
            actual: 0,
            isArchived: false,
        };
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    async list(): Promise<JarDto[]> {
        const rows = await this.jars.find({}, { orderBy: { sortOrder: 'ASC' } });
        return this.applyJarTranslations(rows.map(toJarDto));
    }

    /**
     * Jar balances for a period. Looking Ahead stacks plan fields and grows pot;
     * Looking Back / current are true month snapshots.
     */
    async balances(period: string) {
        const meta = travelForPeriod(period);
        if (meta.travel.direction === 'future') {
            const currentKey = toPeriodKey(meta.current.year, meta.current.month);
            const [baseline, range, spentByCategory] = await Promise.all([
                this.balancesSnapshot(currentKey),
                this.spentCreditedByJarBetween(period, currentKey),
                this.spentByCategoryBetween(period, currentKey),
            ]);
            return scaleJarsForHorizon(baseline, meta.horizon, period, {
                spentByJar: range.spent,
                creditedByJar: range.credited,
                spentByCategory,
            });
        }
        return this.balancesSnapshot(period);
    }

    /**
     * Snapshot balances for one calendar month (no Looking Ahead stacking).
     *
     * `allocated` is the viewed month's income split by the shares that applied in that month.
     * `potBalance` is the sum of every month's deposit since the household started, each at its
     * own month's income and share, plus credited, minus spent. Constant queries: the income
     * rows and the share rows are each read once, whatever the number of months.
     */
    private async balancesSnapshot(period: string) {
        const jars = await this.jars.find({}, { orderBy: { sortOrder: 'ASC' } });
        const startPeriod = await this.potStartPeriod(period);
        const [
            jarDtos,
            categoryNameByEnglish,
            spentByJar,
            creditedByJar,
            spentByCategory,
            committedByJar,
            committedByCategory,
            incomeSources,
            shareRows,
            lifetime,
        ] = await Promise.all([
            this.applyJarTranslations(jars.map(toJarDto)),
            this.categoryNameOverlay(),
            this.spentByJar(period),
            this.creditedByJar(period),
            this.spentByCategory(period),
            this.committedOutByJar(),
            this.committedOutByCategory(),
            this.loadIncomeSources(),
            new HouseholdScopedRepository(this.em, JarShare).find({}),
            this.spentCreditedByJarBetween(startPeriod, period),
        ]);
        const jarById = new Map(jarDtos.map(jar => [jar.id, jar]));
        const currentPeriod = currentPeriodKey();
        const histories = jars.map(jar => ({
            id: jar.id,
            history: healedShareHistory(
                sharesOf(shareRows, jar.id),
                jar.percentage,
                currentPeriod,
                shareRows.length > 0
            ),
        }));
        const incomeAsOfPeriod = (month: string) =>
            monthlyNetAsOf(incomeSources, endOfPeriodIso(month));
        const allocations = new Map(
            allocateMonth(
                incomeAsOfPeriod(period),
                histories.map(pot => ({
                    id: pot.id,
                    basisPoints: shareBasisPointsAt(pot.history, period),
                }))
            ).map(row => [row.id, row.amount])
        );
        const deposits = cumulativeDepositsByPot({
            fromPeriod: startPeriod,
            throughPeriod: period,
            pots: histories,
            incomeAsOfPeriod,
            incomeChangePeriods: incomeChangePeriods(incomeSources),
        });

        return Promise.all(
            jars.map(async jar => {
                const base = jarById.get(jar.id) ?? toJarDto(jar);
                const allocated = allocations.get(jar.id) ?? 0;
                const spent = spentByJar.get(jar.id) ?? 0;
                const credited = creditedByJar.get(jar.id) ?? 0;
                const committedOut = committedByJar.get(jar.id) ?? 0;
                const coverage = jarCoverage({ allocated, spent, credited, committedOut });
                const potBalance = jarPotBalance({
                    cumulativeDeposit: deposits.get(jar.id) ?? 0,
                    lifetimeCredited: lifetime.credited.get(jar.id) ?? 0,
                    lifetimeSpent: lifetime.spent.get(jar.id) ?? 0,
                });
                const cats = await this.categories.find({ jar: jar.id });
                return {
                    ...base,
                    period,
                    allocated,
                    spent,
                    credited,
                    committedOut,
                    remaining: coverage.remaining,
                    available: coverage.available,
                    potBalance,
                    progress: coverage.progress,
                    overspent: coverage.overspent,
                    categories: cats.map(category => {
                        const fixed = committedByCategory.get(category.id) ?? 0;
                        return {
                            id: category.id,
                            jarId: jar.id,
                            name: categoryNameByEnglish.get(category.name) ?? category.name,
                            budgeted: categoryEnvelope(category.budgeted, fixed),
                            actual: spentByCategory.get(category.id) ?? 0,
                            isArchived: category.isArchived,
                        };
                    }),
                };
            })
        );
    }

    /** First period that counts toward cumulative pot (household created → viewed). */
    private async potStartPeriod(throughPeriod: string): Promise<string> {
        const householdId = currentHouseholdId();
        const org = await this.em.findOne(AuthHousehold, { id: householdId });
        if (!org?.createdAt) return throughPeriod;
        const created = new Date(org.createdAt);
        const start = toPeriodKey(created.getUTCFullYear(), created.getUTCMonth() + 1);
        return start <= throughPeriod ? start : throughPeriod;
    }

    /** Overlay catalog locale onto household jars when name/subtitle still match EN seed. */
    private async applyJarTranslations(jars: JarDto[]): Promise<JarDto[]> {
        if (!jars.length) return jars;
        const { locale } = await this.accountSettings.get();
        const catalogLocale = catalogLocaleFromContracts(locale);
        if (isCatalogSourceLocale(catalogLocale)) return jars;

        const fieldMap = await this.translations.fieldMapForType(
            ENTITY_JAR_TEMPLATE,
            catalogLocale,
            jars.map(jar => jar.key)
        );
        const englishByKey = new Map(
            JAR_TEMPLATE_SEED.map(row => [row.key, { name: row.name, subtitle: row.subtitle }])
        );
        return this.translations.applyToMany(jars, fieldMap, ['name', 'subtitle'], row => row.key, {
            englishOf: row => englishByKey.get(row.key) ?? {},
        });
    }

    /** EN category name → localized name for un-renamed household categories. */
    private async categoryNameOverlay(): Promise<Map<string, string>> {
        const { locale } = await this.accountSettings.get();
        const catalogLocale = catalogLocaleFromContracts(locale);
        if (isCatalogSourceLocale(catalogLocale)) return new Map();

        const fieldMap = await this.translations.fieldMapForType(
            ENTITY_CATEGORY_TEMPLATE,
            catalogLocale
        );
        const englishNameByKey = new Map(CATEGORY_TEMPLATE_SEED.map(row => [row.key, row.name]));
        return this.translations.nameByEnglish(fieldMap, englishNameByKey);
    }

    /**
     * Income normalised to a monthly figure as of a date (start/end + amount history).
     * Defaults to today when `asOfDate` is omitted.
     */
    async monthlyNetIncome(asOfDate?: string): Promise<number> {
        const asOf = (asOfDate ?? new Date().toISOString().slice(0, 10)).slice(0, 10);
        return monthlyNetAsOf(await this.loadIncomeSources(), asOf);
    }

    /**
     * Link active fixed costs that have no category by matching English preset names.
     * Call from fixed-cost writes — not from balances reads.
     */
    async reconcileFixedCostCategories(): Promise<void> {
        const rows = await this.em.getConnection().execute<
            {
                id: string;
                jar_id: string;
                category_name: string;
            }[]
        >(
            `SELECT fc.id, fc.jar_id, ct.name AS category_name
             FROM money_fixed_cost fc
             JOIN backoffice.reference_money_fixed_cost_preset p
               ON lower(p.name) = lower(fc.name) AND p.is_active = true
             JOIN backoffice.reference_money_category_template ct
               ON ct.id = p.category_template_id AND ct.is_active = true
            WHERE fc.household_id = ? AND fc.is_active = true AND fc.category_id IS NULL`,
            [currentHouseholdId()]
        );
        if (rows.length === 0) return;

        const needed = new Map<string, { jarId: string; name: string }>();
        for (const row of rows) {
            needed.set(`${row.jar_id}::${row.category_name}`, {
                jarId: row.jar_id,
                name: row.category_name,
            });
        }

        const categoryIdByJarName = new Map<string, string>();
        const existing = await this.categories.find({
            jar: { $in: [...new Set(rows.map(row => row.jar_id))] },
        });
        for (const category of existing) {
            categoryIdByJarName.set(`${category.jar.id}::${category.name}`, category.id);
        }

        const missing = [...needed.values()].filter(
            entry => !categoryIdByJarName.has(`${entry.jarId}::${entry.name}`)
        );
        if (missing.length > 0) {
            const jars = await this.jars.find({
                id: { $in: [...new Set(missing.map(entry => entry.jarId))] },
            });
            const jarById = new Map(jars.map(jar => [jar.id, jar]));
            const created: Array<{ key: string; category: Category }> = [];
            for (const entry of missing) {
                const jar = jarById.get(entry.jarId);
                if (!jar) continue;
                const category = this.em.create(Category, {
                    household: currentHouseholdId(),
                    jar,
                    name: entry.name,
                    budgeted: 0,
                } as never);
                this.em.persist(category);
                created.push({ key: `${entry.jarId}::${entry.name}`, category });
            }
            await this.em.flush();
            for (const entry of created) {
                categoryIdByJarName.set(entry.key, entry.category.id);
            }
        }

        const updates = rows
            .map(row => {
                const categoryId = categoryIdByJarName.get(`${row.jar_id}::${row.category_name}`);
                return categoryId ? { id: row.id, categoryId } : null;
            })
            .filter((row): row is { id: string; categoryId: string } => row !== null);

        await Promise.all(
            updates.map(update =>
                this.em
                    .getConnection()
                    .execute(
                        `UPDATE money_fixed_cost SET category_id = ? WHERE id = ? AND household_id = ?`,
                        [update.categoryId, update.id, currentHouseholdId()]
                    )
            )
        );
    }

    // ====================================================================
    // ? UPDATE Operations
    // ====================================================================

    /**
     * The split is the whole board in one write: every jar of this household exactly once,
     * totalling exactly 100.00. A partial or oversized payload would leave the household
     * above or below 100 and silently invent or lose money, so it is rejected, not
     * normalised. Validation reuses the onboarding rule (`resolveJarSplit`: basis points,
     * `jar_split_keys` / `jar_split_total`) so both entry points agree. A jar id from
     * outside the household is simply not in the scoped list and counts as a bad key.
     */
    async updateSplit(split: { jarId: string; percentage: number }[]): Promise<JarDto[]> {
        // Same lock as `activate` / `deactivate`: validated against the rows as they are once
        // any concurrent turn-on / turn-off has committed, so a stale board can never be
        // written over it and leave the household away from 100.
        await this.em.transactional(async tx => {
            const jars = await this.lockHouseholdJars(tx);
            const jarById = new Map(jars.map(jar => [jar.id, jar]));

            const shares: JarSplitShare[] = split.map(entry => {
                const jar = jarById.get(entry.jarId);
                if (!jar) throw apiBadRequest('jar_split_keys');
                return { key: jar.key, percentage: entry.percentage };
            });
            const validated = resolveJarSplit(
                jars.map(jar => ({
                    key: jar.key,
                    sortOrder: jar.sortOrder,
                    percentage: jar.percentage,
                })),
                shares
            );

            // History first: after this, every pot's share for this month is what the pot says
            // today, so a changed pot is exactly a pot whose new value differs from it.
            const shareRows = await this.loadShares(tx);
            this.reconcileHistory(tx, shareRows, jars);
            const period = currentPeriodKey();
            const jarByKey = new Map(jars.map(jar => [jar.key, jar]));
            for (const share of validated) {
                const jar = jarByKey.get(share.key)!;
                // Round to basis points first so the stored value is exactly what was totalled.
                const next = (Math.round(share.percentage * 100) / 100).toFixed(2);
                // Only a real change writes a row, so saving an untouched pot adds nothing.
                const changed = toBasisPoints(jar.percentage) !== toBasisPoints(next);
                jar.percentage = next;
                if (changed) this.writeShare(tx, shareRows, jar, period, next);
            }
            await tx.flush();
        });
        return this.list();
    }

    /**
     * Assign each jar to a household bank seat (or clear). Rejects seats outside
     * this household. One flush for the whole board map.
     */
    async updatePlacement(
        placements: Array<{ jarId: string; accountId: string | null }>
    ): Promise<JarDto[]> {
        const accountIds = [
            ...new Set(placements.map(row => row.accountId).filter((id): id is string => !!id)),
        ];
        const accounts =
            accountIds.length > 0
                ? await this.em.find(BankAccount, {
                      id: { $in: accountIds },
                      household: currentHouseholdId(),
                  })
                : [];
        const allowed = new Set(accounts.map(account => account.id));
        const jarIds = placements.map(row => row.jarId);
        const jars = await this.jars.find({ id: { $in: jarIds } });
        const jarById = new Map(jars.map(jar => [jar.id, jar]));

        for (const row of placements) {
            if (row.accountId && !allowed.has(row.accountId)) {
                throw apiBadRequest('jar_placement_account_invalid');
            }
            const jar = jarById.get(row.jarId);
            if (!jar) {
                throw apiBadRequest('jar_placement_account_invalid');
            }
            jar.defaultAccount = row.accountId;
        }
        await this.em.flush();
        return this.list();
    }

    /**
     * Put every jar that has no seat yet on `accountId`. Called when the household's
     * first bank account is created, so one main account carries every pot. Jars the
     * household already placed are never moved. Caller guarantees the account is this
     * household's; the caller flushes nothing else, this flushes its own change.
     */
    async placeUnplaced(accountId: string): Promise<void> {
        const unplaced = await this.jars.find({ defaultAccount: null });
        for (const jar of unplaced) jar.defaultAccount = accountId;
        if (unplaced.length > 0) await this.em.flush();
    }

    async update(
        id: string,
        patch: Partial<Pick<Jar, 'name' | 'subtitle' | 'icon'>>
    ): Promise<JarDto> {
        const jar = await this.jars.findOneOrFail({ id });
        Object.assign(jar, patch);
        await this.em.flush();
        return toJarDto(jar);
    }

    async updateCategory(
        id: string,
        patch: Partial<{ name: string; budgeted: number; isArchived: boolean }>
    ) {
        const cat = await this.categories.findOneOrFail({ id });
        Object.assign(cat, patch);
        await this.em.flush();
        return {
            id: cat.id,
            jarId: cat.jar.id,
            name: cat.name,
            budgeted: cat.budgeted,
            /** Period actual only exists on JarBalance — CRUD has no period. */
            actual: 0,
            isArchived: cat.isArchived,
        };
    }

    // ====================================================================
    // ? DELETE Operations
    // ====================================================================

    /**
     * Turn off an optional pot: its share goes back to the group's main pot and the pot is
     * deleted. Main pots cannot be turned off (`jar_not_optional`).
     *
     * A pot that anything points at stays on (`jar_not_empty`): the foreign keys of
     * transactions and goals are SET NULL, so deleting would silently drop that money out of
     * every sum, and fixed costs, sort rules and week-check allocations would be deleted with
     * it. The same goes for a transaction, fixed cost or sort rule in another pot that uses a
     * category of this pot (the category would be nulled). Unused categories alone do not
     * block; they go with the pot. Moving the contents to the
     * main pot is a deliberate separate step, not done here.
     *
     * The same lock as `activate` and `updateSplit` (every jar of the household): it
     * serialises with a concurrent activation or split save and makes a transaction being
     * sorted into this pot at the same moment wait (then fail its foreign key) instead of
     * being nulled.
     */
    async deactivate(jarId: string): Promise<void> {
        const target = await this.jars.findOne({ id: jarId });
        if (!target) throw new NotFoundException('Jar not found in this household');
        if (isMainJarKey(target.key)) throw apiBadRequest('jar_not_optional');
        const mainKey = mainJarKeyFor(target.key);

        await this.em.transactional(async tx => {
            const scoped = new HouseholdScopedRepository(tx, Jar);
            const locked = await this.lockHouseholdJars(tx);
            const jar = locked.find(row => row.id === jarId);
            const main = locked.find(row => row.key === mainKey);
            if (!jar) throw new NotFoundException('Jar not found in this household');
            if (!main) throw new NotFoundException(`Household has no ${mainKey} pot`);

            // Rows in this pot, and rows elsewhere that use one of its categories: deleting the
            // pot cascades its categories, which would null that category on those rows.
            const inPot = { $or: [{ jar: jarId }, { category: { jar: jarId } }] };
            const references = await Promise.all([
                new HouseholdScopedRepository(tx, Transaction).count(inPot),
                new HouseholdScopedRepository(tx, FixedCost).count(inPot),
                new HouseholdScopedRepository(tx, Goal).count({ jar: jarId }),
                new HouseholdScopedRepository(tx, SortRule).count(inPot),
                new HouseholdScopedRepository(tx, WeekCheckAllocation).count({ jar: jarId }),
            ]);
            if (references.some(count => count > 0)) throw apiBadRequest('jar_not_empty');

            // Past months keep the money both pots had: the removed pot's history is added onto
            // the main pot's, period by period, before the pot (and its rows) go.
            const shareRows = await this.loadShares(tx);
            this.reconcileHistory(tx, shareRows, locked);
            const period = currentPeriodKey();
            const merged = mergeShareHistories(
                potShareHistory(sharesOf(shareRows, main.id), main.percentage),
                potShareHistory(sharesOf(shareRows, jar.id), jar.percentage),
                period
            );
            main.percentage = fromBasisPoints(
                toBasisPoints(main.percentage) + toBasisPoints(jar.percentage)
            );
            for (const share of merged) {
                this.writeShare(
                    tx,
                    shareRows,
                    main,
                    share.period,
                    fromBasisPoints(share.basisPoints)
                );
            }
            // The cached percentage wins if the history had drifted from it.
            this.writeShare(tx, shareRows, main, period, main.percentage);
            const shareScoped = new HouseholdScopedRepository(tx, JarShare);
            for (const row of sharesOf(shareRows, jar.id)) shareScoped.remove(row);
            scoped.remove(jar);
        });
    }

    async deleteCategory(id: string) {
        const cat = await this.categories.findOneOrFail({ id });
        await this.em.remove(cat).flush();
    }

    // Private

    /** Every share row of the household (the whole history is a handful of rows per pot). */
    private loadShares(tx: EntityManager): Promise<JarShare[]> {
        return new HouseholdScopedRepository(tx, JarShare).find({});
    }

    /**
     * Set the pot's share from `period` on: update that month's row, or add one. `shareRows` is
     * the household's loaded list and is kept in step, so later reads in the same transaction
     * see the write. Callers keep the invariant: after any change, every pot's row for the
     * current period equals `jar.percentage`.
     */
    private writeShare(
        tx: EntityManager,
        shareRows: JarShare[],
        jar: Jar,
        period: string,
        percentage: string
    ): void {
        const existing = shareRows.find(row => row.jar.id === jar.id && row.period === period);
        if (existing) {
            existing.percentage = percentage;
            return;
        }
        const created = new HouseholdScopedRepository(tx, JarShare).create({
            jar,
            period,
            percentage,
        });
        tx.persist(created);
        shareRows.push(created);
    }

    /**
     * Bring the share history in line with the pots as they are today, before a write builds on
     * it. The old backend can still run `activate` / `deactivate` / `updateSplit` for a short
     * while after `money_jar_share` exists, and it writes no share rows. Two repairs, nothing
     * else:
     *
     * - A pot with NO rows: if the household has no share rows at all (the table was not filled
     *   yet), every such pot gets the baseline row (`JAR_SHARE_BASELINE_PERIOD`) with its
     *   percentage, which is what reads already treated it as. If the household has rows for
     *   other pots, this pot was created by the old code: its first row goes at the CURRENT
     *   month, so it counts from now on, like a pot turned on now, and never from 1970, which
     *   would push earlier months above 100 %.
     * - A pot whose share for the current month differs from `jar.percentage` (an old-code
     *   change): a current-month row with `jar.percentage` is written. The drift stays confined
     *   to the months of the deploy window.
     *
     * After this, every pot's row for the current month equals `jar.percentage`.
     */
    private reconcileHistory(tx: EntityManager, shareRows: JarShare[], jars: Jar[]): void {
        const householdHasRows = shareRows.length > 0;
        const period = currentPeriodKey();
        for (const jar of jars) {
            const own = sharesOf(shareRows, jar.id);
            if (own.length === 0) {
                const first = householdHasRows ? period : JAR_SHARE_BASELINE_PERIOD;
                this.writeShare(tx, shareRows, jar, first, jar.percentage);
                continue;
            }
            const shareNow = shareBasisPointsAt(potShareHistory(own, jar.percentage), period);
            if (shareNow !== toBasisPoints(jar.percentage)) {
                this.writeShare(tx, shareRows, jar, period, jar.percentage);
            }
        }
    }

    /** Income sources and their amount history, two queries, mapped for `monthlyNetAsOf`. */
    private async loadIncomeSources() {
        const householdId = currentHouseholdId();
        const [sourceRows, periodRows] = await Promise.all([
            this.em.getConnection().execute<IncomeSourceRow[]>(
                `SELECT id, amount::text, cadence, is_active, started_on, ends_on
                 FROM money_income_source WHERE household_id = ?`,
                [householdId]
            ),
            this.em.getConnection().execute<IncomeAmountPeriodRow[]>(
                `SELECT income_source_id, amount::text, effective_on
                 FROM money_income_amount_period WHERE household_id = ?`,
                [householdId]
            ),
        ]);
        return toIncomeSources(sourceRows, periodRows);
    }

    /**
     * Lock every jar of the household for the rest of the transaction, in a fixed order (by
     * id) so two writers can never wait on each other. `activate`, `deactivate` and
     * `updateSplit` all start here, which makes the household's percentages a single
     * serialised resource, and they validate against these rows, not an earlier read.
     */
    private lockHouseholdJars(tx: EntityManager): Promise<Jar[]> {
        return new HouseholdScopedRepository(tx, Jar).find(
            {},
            { orderBy: { id: 'ASC' }, lockMode: LockMode.PESSIMISTIC_WRITE }
        );
    }

    /**
     * Sum sorted OUT / IN across an inclusive YYYY-MM range (Looking Back stack).
     * Single query — do not N+1 per month.
     */
    async spentCreditedByJarBetween(
        fromPeriod: string,
        toPeriod: string
    ): Promise<{ spent: Map<string, number>; credited: Map<string, number> }> {
        const start = fromPeriod <= toPeriod ? fromPeriod : toPeriod;
        const end = fromPeriod <= toPeriod ? toPeriod : fromPeriod;
        const [spentRows, creditedRows] = await Promise.all([
            this.em.getConnection().execute<{ jar_id: string; total: string }[]>(
                `SELECT jar_id, COALESCE(SUM(-amount), 0)::text AS total
             FROM money_transaction
            WHERE household_id = ? AND status = 'SORTED' AND amount < 0
              AND to_char(booked_on, 'YYYY-MM') >= ?
              AND to_char(booked_on, 'YYYY-MM') <= ?
            GROUP BY jar_id`,
                [currentHouseholdId(), start, end]
            ),
            this.em.getConnection().execute<{ jar_id: string; total: string }[]>(
                `SELECT jar_id, COALESCE(SUM(amount), 0)::text AS total
             FROM money_transaction
            WHERE household_id = ? AND status = 'SORTED' AND amount > 0
              AND to_char(booked_on, 'YYYY-MM') >= ?
              AND to_char(booked_on, 'YYYY-MM') <= ?
            GROUP BY jar_id`,
                [currentHouseholdId(), start, end]
            ),
        ]);
        return {
            spent: new Map(
                spentRows.filter(row => row.jar_id).map(row => [row.jar_id, Number(row.total)])
            ),
            credited: new Map(
                creditedRows.filter(row => row.jar_id).map(row => [row.jar_id, Number(row.total)])
            ),
        };
    }

    /** Sum category OUT across an inclusive period range. */
    async spentByCategoryBetween(
        fromPeriod: string,
        toPeriod: string
    ): Promise<Map<string, number>> {
        const start = fromPeriod <= toPeriod ? fromPeriod : toPeriod;
        const end = fromPeriod <= toPeriod ? toPeriod : fromPeriod;
        const rows = await this.em
            .getConnection()
            .execute<{ category_id: string; total: string }[]>(
                `SELECT category_id, COALESCE(SUM(-amount), 0)::text AS total
             FROM money_transaction
            WHERE household_id = ? AND status = 'SORTED' AND amount < 0
              AND category_id IS NOT NULL
              AND to_char(booked_on, 'YYYY-MM') >= ?
              AND to_char(booked_on, 'YYYY-MM') <= ?
            GROUP BY category_id`,
                [currentHouseholdId(), start, end]
            );
        return new Map(
            rows.filter(row => row.category_id).map(row => [row.category_id, Number(row.total)])
        );
    }

    /** One grouped query rather than a per-jar round trip. */
    private async spentByJar(period: string): Promise<Map<string, number>> {
        const rows = await this.em.getConnection().execute<{ jar_id: string; total: string }[]>(
            `SELECT jar_id, COALESCE(SUM(-amount), 0)::text AS total
         FROM money_transaction
        WHERE household_id = ? AND status = 'SORTED' AND amount < 0
          AND to_char(booked_on, 'YYYY-MM') = ?
        GROUP BY jar_id`,
            [currentHouseholdId(), period]
        );
        return new Map(rows.filter(row => row.jar_id).map(row => [row.jar_id, Number(row.total)]));
    }

    /** Sorted Transaction In (gifts, top-ups) per jar for the period. */
    private async creditedByJar(period: string): Promise<Map<string, number>> {
        const rows = await this.em.getConnection().execute<{ jar_id: string; total: string }[]>(
            `SELECT jar_id, COALESCE(SUM(amount), 0)::text AS total
         FROM money_transaction
        WHERE household_id = ? AND status = 'SORTED' AND amount > 0
          AND to_char(booked_on, 'YYYY-MM') = ?
        GROUP BY jar_id`,
            [currentHouseholdId(), period]
        );
        return new Map(rows.filter(row => row.jar_id).map(row => [row.jar_id, Number(row.total)]));
    }

    /** Sorted OUT spend per category for the period. */
    private async spentByCategory(period: string): Promise<Map<string, number>> {
        const rows = await this.em
            .getConnection()
            .execute<{ category_id: string; total: string }[]>(
                `SELECT category_id, COALESCE(SUM(-amount), 0)::text AS total
             FROM money_transaction
            WHERE household_id = ? AND status = 'SORTED' AND amount < 0
              AND category_id IS NOT NULL
              AND to_char(booked_on, 'YYYY-MM') = ?
            GROUP BY category_id`,
                [currentHouseholdId(), period]
            );
        return new Map(
            rows.filter(row => row.category_id).map(row => [row.category_id, Number(row.total)])
        );
    }

    /** Fixed OUT per jar, monthly-normalised, as-of today (start/end aware). */
    private async committedOutByJar(): Promise<Map<string, number>> {
        const today = new Date().toISOString().slice(0, 10);
        const rows = await this.em.getConnection().execute<
            {
                jar_id: string;
                amount: string;
                cadence: Cadence;
                is_active: boolean;
                started_on: string | null;
                ends_on: string | null;
            }[]
        >(
            `SELECT jar_id, amount::text, cadence, is_active, started_on, ends_on
             FROM money_fixed_cost
            WHERE household_id = ? AND direction = 'OUT'`,
            [currentHouseholdId()]
        );
        const map = new Map<string, number>();
        for (const row of rows) {
            if (!row.jar_id) continue;
            if (
                !fixedCostAppliesAsOf(
                    {
                        isActive: row.is_active,
                        startedOn: row.started_on,
                        endsOn: row.ends_on,
                    },
                    today
                )
            ) {
                continue;
            }
            const monthly = monthlyAmount(Number(row.amount), row.cadence);
            map.set(row.jar_id, (map.get(row.jar_id) ?? 0) + monthly);
        }
        return map;
    }

    /** Fixed OUT per category, monthly-normalised (uncategorised rows omitted), as-of today. */
    private async committedOutByCategory(): Promise<Map<string, number>> {
        const today = new Date().toISOString().slice(0, 10);
        const rows = await this.em.getConnection().execute<
            {
                category_id: string;
                amount: string;
                cadence: Cadence;
                is_active: boolean;
                started_on: string | null;
                ends_on: string | null;
            }[]
        >(
            `SELECT category_id, amount::text, cadence, is_active, started_on, ends_on
             FROM money_fixed_cost
            WHERE household_id = ? AND direction = 'OUT'
              AND category_id IS NOT NULL`,
            [currentHouseholdId()]
        );
        const map = new Map<string, number>();
        for (const row of rows) {
            if (!row.category_id) continue;
            if (
                !fixedCostAppliesAsOf(
                    {
                        isActive: row.is_active,
                        startedOn: row.started_on,
                        endsOn: row.ends_on,
                    },
                    today
                )
            ) {
                continue;
            }
            const monthly = monthlyAmount(Number(row.amount), row.cadence);
            map.set(row.category_id, (map.get(row.category_id) ?? 0) + monthly);
        }
        return map;
    }
}

/**
 * The budget month a write belongs to, found the way the rest of the money module finds "this
 * month" (`travelForPeriod`: the calendar month of today).
 */
function currentPeriodKey(now = new Date()): string {
    const { year, month } = currentYearMonth(now);
    return toPeriodKey(year, month);
}

/** One pot's share rows out of the household's list. */
function sharesOf(shareRows: readonly JarShare[], jarId: string): JarShare[] {
    return shareRows.filter(row => row.jar.id === jarId);
}

function toJarDto(jar: Jar): JarDto {
    return {
        // String-enum members are nominal in TypeScript, so they need widening to the
        // contract's literal union even though the runtime values are identical.
        id: jar.id,
        householdId: jar.household,
        key: jar.key,
        name: jar.name,
        subtitle: jar.subtitle,
        icon: jar.icon,
        percentage: Number(jar.percentage),
        capabilities: jarCapabilitiesFor(jar.key),
        sortOrder: jar.sortOrder,
        defaultAccountId: jar.defaultAccount,
    };
}
