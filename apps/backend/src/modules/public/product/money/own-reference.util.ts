import { type EntityManager } from '@mikro-orm/postgresql';

import { apiNotFound } from '../../../../common/errors/api-user-error';
import { HouseholdScopedRepository } from '../../../../common/household/household-scoped.repository';
import { BankAccount } from './ledger/bank-account/bank-account.entity';
import { FixedCost } from './plan/fixed-cost/fixed-cost.entity';
import { Category } from './plan/jar/category.entity';
import { Jar } from './plan/jar/jar.entity';
import { Debt } from './targets/debt/debt.entity';

/**
 * Resolve an id that came from the client to a row of the current household.
 *
 * The foreign keys on money rows (`jar_id`, `category_id`, …) are on the id alone, so
 * `em.getReference(Jar, idFromClient)` would happily attach a row to another household's jar.
 * Every service that takes one of these ids from the wire goes through here instead: the
 * lookup is scoped by `HouseholdScopedRepository`, and an id that is not this household's
 * is refused exactly like one that does not exist (no way to probe other households).
 */

/** The household's own jar, or `jar_not_found`. */
export async function requireOwnJar(em: EntityManager, jarId: string): Promise<Jar> {
    const jar = await new HouseholdScopedRepository(em, Jar).findOne({ id: jarId });
    if (!jar) throw apiNotFound('jar_not_found');
    return jar;
}

/**
 * The household's own jars for a set of ids, in one query. All-or-nothing: one foreign or
 * unknown id refuses the whole call so a bulk write never half-applies.
 */
export async function requireOwnJars(
    em: EntityManager,
    jarIds: readonly string[]
): Promise<Map<string, Jar>> {
    const unique = [...new Set(jarIds)];
    if (unique.length === 0) return new Map();
    const rows = await new HouseholdScopedRepository(em, Jar).find({ id: { $in: unique } });
    if (rows.length !== unique.length) throw apiNotFound('jar_not_found');
    return new Map(rows.map(row => [row.id, row]));
}

/** The household's own category, or `category_not_found`. */
export async function requireOwnCategory(em: EntityManager, categoryId: string): Promise<Category> {
    const category = await new HouseholdScopedRepository(em, Category).findOne({
        id: categoryId,
    });
    if (!category) throw apiNotFound('category_not_found');
    return category;
}

/** The household's own debt, or `debt_not_found`. */
export async function requireOwnDebt(em: EntityManager, debtId: string): Promise<Debt> {
    const debt = await new HouseholdScopedRepository(em, Debt).findOne({ id: debtId });
    if (!debt) throw apiNotFound('debt_not_found');
    return debt;
}

/** The household's own bank account, or `bank_account_not_found`. */
export async function requireOwnBankAccount(
    em: EntityManager,
    accountId: string
): Promise<BankAccount> {
    const account = await new HouseholdScopedRepository(em, BankAccount).findOne({
        id: accountId,
    });
    if (!account) throw apiNotFound('bank_account_not_found');
    return account;
}

/** The household's own fixed cost, or `fixed_cost_not_found`. */
export async function requireOwnFixedCost(
    em: EntityManager,
    fixedCostId: string
): Promise<FixedCost> {
    const fixedCost = await new HouseholdScopedRepository(em, FixedCost).findOne({
        id: fixedCostId,
    });
    if (!fixedCost) throw apiNotFound('fixed_cost_not_found');
    return fixedCost;
}
