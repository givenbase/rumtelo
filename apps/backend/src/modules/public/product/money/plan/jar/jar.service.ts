import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';

import { type Jar as ContractJar, type Cadence, jarCapabilitiesFor } from '@rumtelo/contracts';
import {
    allocateByPercentage,
    categoryEnvelope,
    jarCoverage,
    monthlyAmount,
    sumMonthly,
} from '@rumtelo/utils';

import { HouseholdScopedRepository } from '../../../../../../common/household/household-scoped.repository';
import { currentHouseholdId } from '../../../../../../common/household/household.context';
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

    constructor(@Inject(EntityManager) private readonly em: EntityManager) {
        this.jars = new HouseholdScopedRepository(em, Jar);
        this.categories = new HouseholdScopedRepository(em, Category);
    }

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    async createCategory(jarId: string, name: string, budgeted: number) {
        const jar = await this.jars.findOneOrFail({ id: jarId });
        const cat = this.em.create(Category, {
            household: currentHouseholdId(),
            jar,
            name,
            budgeted,
        } as never);
        await this.em.persist(cat).flush();
        return {
            id: cat.id,
            jarId: jar.id,
            name: cat.name,
            budgeted: Number(cat.budgeted),
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
        return rows.map(toJarDto);
    }

    async balances(period: string) {
        const jars = await this.jars.find({}, { orderBy: { sortOrder: 'ASC' } });
        const spentByJar = await this.spentByJar(period);
        const creditedByJar = await this.creditedByJar(period);
        const spentByCategory = await this.spentByCategory(period);
        const committedByJar = await this.committedOutByJar();
        const committedByCategory = await this.committedOutByCategory();
        const income = await this.monthlyNetIncome();
        const allocations = new Map(
            allocateByPercentage(
                income,
                jars.map(jar => ({ id: jar.id, percentage: Number(jar.percentage) }))
            ).map(row => [row.id, row.amount])
        );

        return Promise.all(
            jars.map(async jar => {
                const allocated = allocations.get(jar.id) ?? 0;
                const spent = spentByJar.get(jar.id) ?? 0;
                const credited = creditedByJar.get(jar.id) ?? 0;
                const committedOut = committedByJar.get(jar.id) ?? 0;
                const coverage = jarCoverage({ allocated, spent, credited, committedOut });
                const cats = await this.categories.find({ jar: jar.id });
                return {
                    ...toJarDto(jar),
                    period,
                    allocated,
                    spent,
                    credited,
                    committedOut,
                    remaining: coverage.remaining,
                    available: coverage.available,
                    progress: coverage.progress,
                    overspent: coverage.overspent,
                    categories: cats.map(category => {
                        const fixed = committedByCategory.get(category.id) ?? 0;
                        return {
                            id: category.id,
                            jarId: jar.id,
                            name: category.name,
                            budgeted: categoryEnvelope(Number(category.budgeted), fixed),
                            actual: spentByCategory.get(category.id) ?? 0,
                            isArchived: category.isArchived,
                        };
                    }),
                };
            })
        );
    }

    /** Active income normalised to a monthly figure. */
    async monthlyNetIncome(): Promise<number> {
        const rows = await this.em
            .getConnection()
            .execute<{ amount: string; cadence: Cadence }[]>(
                `SELECT amount::text, cadence FROM money_income_source WHERE household_id = ? AND is_active = true`,
                [currentHouseholdId()]
            );
        return sumMonthly(rows.map(row => ({ amount: Number(row.amount), cadence: row.cadence })));
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
               ON ct.key = p.category_template_key AND ct.is_active = true
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
     * A split that does not total 100 silently loses or invents money, so this is
     * rejected rather than normalised.
     */
    async updateSplit(split: { jarId: string; percentage: number }[]): Promise<JarDto[]> {
        const total = split.reduce((sum, entry) => sum + entry.percentage, 0);
        if (Math.abs(total - 100) > 0.01) {
            throw new Error(`Jar split must total 100%, received ${total}%`);
        }
        const jars = await Promise.all(
            split.map(({ jarId }) => this.jars.findOneOrFail({ id: jarId }))
        );
        for (const [index, jar] of jars.entries()) {
            jar.percentage = split[index]!.percentage.toFixed(2);
        }
        await this.em.flush();
        return this.list();
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
            budgeted: Number(cat.budgeted),
            /** Period actual only exists on JarBalance — CRUD has no period. */
            actual: 0,
            isArchived: cat.isArchived,
        };
    }

    // ====================================================================
    // ? DELETE Operations
    // ====================================================================

    async deleteCategory(id: string) {
        const cat = await this.categories.findOneOrFail({ id });
        await this.em.remove(cat).flush();
    }

    // Private

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

    /** Active fixed OUT per jar, monthly-normalised. */
    private async committedOutByJar(): Promise<Map<string, number>> {
        const rows = await this.em
            .getConnection()
            .execute<{ jar_id: string; amount: string; cadence: Cadence }[]>(
                `SELECT jar_id, amount::text, cadence
             FROM money_fixed_cost
            WHERE household_id = ? AND is_active = true AND direction = 'OUT'`,
                [currentHouseholdId()]
            );
        const map = new Map<string, number>();
        for (const row of rows) {
            if (!row.jar_id) continue;
            const monthly = monthlyAmount(Number(row.amount), row.cadence);
            map.set(row.jar_id, (map.get(row.jar_id) ?? 0) + monthly);
        }
        return map;
    }

    /** Active fixed OUT per category, monthly-normalised (uncategorised rows omitted). */
    private async committedOutByCategory(): Promise<Map<string, number>> {
        const rows = await this.em
            .getConnection()
            .execute<{ category_id: string; amount: string; cadence: Cadence }[]>(
                `SELECT category_id, amount::text, cadence
             FROM money_fixed_cost
            WHERE household_id = ? AND is_active = true AND direction = 'OUT'
              AND category_id IS NOT NULL`,
                [currentHouseholdId()]
            );
        const map = new Map<string, number>();
        for (const row of rows) {
            if (!row.category_id) continue;
            const monthly = monthlyAmount(Number(row.amount), row.cadence);
            map.set(row.category_id, (map.get(row.category_id) ?? 0) + monthly);
        }
        return map;
    }
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
    };
}
