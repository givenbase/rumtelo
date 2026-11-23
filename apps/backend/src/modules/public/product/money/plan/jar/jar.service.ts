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
    allocateByPercentage,
    categoryEnvelope,
    endOfPeriodIso,
    fixedCostAppliesAsOf,
    jarCoverage,
    jarPotBalance,
    monthlyAmount,
    monthlyNetAsOf,
    parsePeriodKey,
    periodKeysInclusive,
    scaleJarsForHorizon,
    toPeriodKey,
    travelForPeriod,
} from '@rumtelo/utils';

import { HouseholdScopedRepository } from '../../../../../../common/household/household-scoped.repository';
import { currentHouseholdId } from '../../../../../../common/household/household.context';
import { apiBadRequest } from '../../../../../../common/errors/api-user-error';
import { parseUniqueConstraint } from '../../../../../../common/utils/database-constraint-error.util';
import { resolveJarSplit, type JarShare } from '../../../../../../common/utils/jar-split.util';
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
import { Jar } from './jar.entity';

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

    /** Snapshot balances for one calendar month (no Looking Ahead stacking). */
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
            income,
            lifetime,
        ] = await Promise.all([
            this.applyJarTranslations(jars.map(toJarDto)),
            this.categoryNameOverlay(),
            this.spentByJar(period),
            this.creditedByJar(period),
            this.spentByCategory(period),
            this.committedOutByJar(),
            this.committedOutByCategory(),
            this.monthlyNetIncome(endOfPeriodIso(period)),
            this.spentCreditedByJarBetween(startPeriod, period),
        ]);
        const jarById = new Map(jarDtos.map(jar => [jar.id, jar]));
        const allocations = new Map(
            allocateByPercentage(
                income,
                jars.map(jar => ({ id: jar.id, percentage: Number(jar.percentage) }))
            ).map(row => [row.id, row.amount])
        );
        const monthCount = periodKeysInclusive(
            parsePeriodKey(startPeriod),
            parsePeriodKey(period)
        ).length;

        return Promise.all(
            jars.map(async jar => {
                const base = jarById.get(jar.id) ?? toJarDto(jar);
                const allocated = allocations.get(jar.id) ?? 0;
                const spent = spentByJar.get(jar.id) ?? 0;
                const credited = creditedByJar.get(jar.id) ?? 0;
                const committedOut = committedByJar.get(jar.id) ?? 0;
                const coverage = jarCoverage({ allocated, spent, credited, committedOut });
                const potBalance = jarPotBalance({
                    allocated,
                    monthCount,
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
        const householdId = currentHouseholdId();
        const [rows, periodRows] = await Promise.all([
            this.em.getConnection().execute<
                {
                    id: string;
                    amount: string;
                    cadence: Cadence;
                    is_active: boolean;
                    started_on: string | null;
                    ends_on: string | null;
                }[]
            >(
                `SELECT id, amount::text, cadence, is_active, started_on, ends_on
                 FROM money_income_source WHERE household_id = ?`,
                [householdId]
            ),
            this.em.getConnection().execute<
                {
                    income_source_id: string;
                    amount: string;
                    effective_on: string;
                }[]
            >(
                `SELECT income_source_id, amount::text, effective_on
                 FROM money_income_amount_period WHERE household_id = ?`,
                [householdId]
            ),
        ]);
        const periodsBySource = new Map<string, { amount: number; effectiveOn: string }[]>();
        for (const row of periodRows) {
            const list = periodsBySource.get(row.income_source_id) ?? [];
            list.push({ amount: Number(row.amount), effectiveOn: row.effective_on });
            periodsBySource.set(row.income_source_id, list);
        }
        return monthlyNetAsOf(
            rows.map(row => ({
                amount: Number(row.amount),
                cadence: row.cadence,
                isActive: row.is_active,
                startedOn: row.started_on,
                endsOn: row.ends_on,
                periods: periodsBySource.get(row.id) ?? [],
            })),
            asOf
        );
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

            const shares: JarShare[] = split.map(entry => {
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

            const jarByKey = new Map(jars.map(jar => [jar.key, jar]));
            for (const share of validated) {
                // Round to basis points first so the stored value is exactly what was totalled.
                jarByKey.get(share.key)!.percentage = (
                    Math.round(share.percentage * 100) / 100
                ).toFixed(2);
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

            main.percentage = fromBasisPoints(
                toBasisPoints(main.percentage) + toBasisPoints(jar.percentage)
            );
            scoped.remove(jar);
        });
    }

    async deleteCategory(id: string) {
        const cat = await this.categories.findOneOrFail({ id });
        await this.em.remove(cat).flush();
    }

    // Private

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

/** A stored percentage (decimal string or number) as integer basis points (0.01 %). */
function toBasisPoints(percentage: string | number): number {
    return Math.round(Number(percentage) * 100);
}

/** Basis points back to the stored decimal string with two decimals. */
function fromBasisPoints(basisPoints: number): string {
    return (basisPoints / 100).toFixed(2);
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
