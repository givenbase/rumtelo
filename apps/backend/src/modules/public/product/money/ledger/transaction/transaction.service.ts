import { EntityManager } from '@mikro-orm/postgresql';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';

import { containsWord } from '@rumtelo/utils';
import { HouseholdScopedRepository } from '../../../../../../common/household/household-scoped.repository';
import { currentHouseholdId } from '../../../../../../common/household/household.context';
import { MerchantPresetService } from '../../../../../backoffice/product/money/preset/merchant/merchant.service';
import { Category } from '../../plan/jar/category.entity';
import { Jar } from '../../plan/jar/jar.entity';
import { applyDebtLinkChange } from '../../targets/debt/debt-link.util';
import { BankAccount } from '../bank-account/bank-account.entity';
import { SortRuleService } from '../sort-rule/sort-rule.service';
import { parseStatementCsv } from './csv/csv-parser';
import { jarCapabilitiesFor, TransactionSource, TransactionStatus } from '@rumtelo/contracts';

import { Transaction } from './transaction.entity';

@Injectable()
export class TransactionService {
    private readonly transactions: HouseholdScopedRepository<Transaction>;

    constructor(
        @Inject(EntityManager) private readonly em: EntityManager,
        @Inject(SortRuleService) private readonly rules: SortRuleService,
        @Inject(MerchantPresetService) private readonly merchants: MerchantPresetService
    ) {
        this.transactions = new HouseholdScopedRepository(em, Transaction);
    }

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    async create(input: {
        accountId?: string | null;
        jarId?: string | null;
        categoryId?: string | null;
        debtId?: string | null;
        amount: number;
        bookedOn: string;
        description: string;
        counterparty?: string | null;
        inflowKey?: string | null;
        note?: string | null;
    }) {
        if (input.jarId) {
            await assertJarAllowsOutflow(this.em, input.jarId, input.amount);
        }
        const entity = this.em.create(Transaction, {
            household: currentHouseholdId(),
            account: input.accountId ? this.em.getReference(BankAccount, input.accountId) : null,
            jar: input.jarId ? this.em.getReference(Jar, input.jarId) : null,
            category: input.categoryId ? this.em.getReference(Category, input.categoryId) : null,
            debt: null,
            amount: input.amount,
            bookedOn: input.bookedOn,
            description: input.description,
            counterparty: input.counterparty ?? null,
            inflowKey: input.amount > 0 ? input.inflowKey?.trim() || null : null,
            note: input.note ?? null,
            status: input.jarId ? TransactionStatus.SORTED : TransactionStatus.INBOX,
            source: TransactionSource.MANUAL,
            // Manual rows are never de-duplicated: two identical coffees on one day are
            // both real. UNIQUE(household, dedupeKey) is for imports only.
            dedupeKey: null,
        } as never);
        await this.em.persist(entity).flush();

        if (input.debtId) {
            await applyDebtLinkChange(this.em, entity, input.debtId);
            await this.em.flush();
        }

        return toDto(entity);
    }

    /**
     * CSV is the always-on import path; bank sync is the optional one. Import is
     * idempotent via dedupeKey, so re-uploading the same statement is safe.
     */
    async importCsv(accountId: string, content: string, dryRun: boolean) {
        const parsed = parseStatementCsv(content);
        const keys = parsed.map(row =>
            dedupeKey(accountId, row.bookedOn, row.amount, row.description)
        );

        const existing = keys.length
            ? await this.transactions.find({ dedupeKey: { $in: keys } })
            : [];
        const seen = new Set(existing.map(transaction => transaction.dedupeKey));
        const freshCount = keys.filter(key => !seen.has(key)).length;

        const incoming: {
            bookedOn: string;
            amount: number;
            description: string;
            counterparty: string | null;
            dedupeKey: string;
        }[] = [];
        parsed.forEach((row, index) => {
            const key = keys[index]!;
            if (seen.has(key)) return;
            seen.add(key);
            incoming.push({ ...row, dedupeKey: key });
        });

        let sorted = 0;
        if (dryRun) {
            sorted = await this.rules.autoSort(
                incoming.map(row => ({
                    amount: row.amount,
                    description: row.description,
                    counterparty: row.counterparty,
                    status: TransactionStatus.INBOX,
                    jar: null,
                    category: null,
                    appliedRule: null,
                    appliedMerchantKey: null,
                })),
                { countHits: false }
            );
        } else {
            const created = incoming.map(row =>
                this.em.create(Transaction, {
                    household: currentHouseholdId(),
                    account: this.em.getReference(BankAccount, accountId),
                    amount: row.amount,
                    bookedOn: row.bookedOn,
                    description: row.description,
                    counterparty: row.counterparty,
                    status: TransactionStatus.INBOX,
                    source: TransactionSource.CSV,
                    dedupeKey: row.dedupeKey,
                } as never)
            );
            sorted = await this.rules.autoSort(created, { countHits: true });
            await this.em.flush();
        }

        return {
            detected: parsed.length,
            duplicates: parsed.length - freshCount,
            willImport: freshCount,
            sorted,
            sample: [],
        };
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    async inbox() {
        const rows = await this.transactions.find(
            { status: TransactionStatus.INBOX },
            { orderBy: { bookedOn: 'DESC' }, limit: 200 }
        );
        return rows.map(toDto);
    }

    async list(filter: {
        status?: string | null;
        jarId?: string | null;
        debtId?: string | null;
        limit: number;
    }) {
        const where: Record<string, unknown> = {};
        if (filter.status) where.status = filter.status;
        if (filter.jarId) where.jar = filter.jarId;
        if (filter.debtId) where.debt = filter.debtId;

        const rows = await this.transactions.find(where, {
            orderBy: { bookedOn: 'DESC' },
            limit: filter.limit + 1,
        });
        await this.em.populate(rows, ['debt']);
        const hasMore = rows.length > filter.limit;
        const page = hasMore ? rows.slice(0, filter.limit) : rows;
        return { items: page.map(toDto), nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null };
    }

    async countInbox() {
        return this.transactions.count({ status: TransactionStatus.INBOX });
    }

    // ====================================================================
    // ? UPDATE Operations
    // ====================================================================

    async sort(
        transactionId: string,
        jarId: string,
        categoryId?: string | null,
        createRule = false,
        debtId?: string | null
    ) {
        const entity = await this.transactions.findOneOrFail({ id: transactionId });
        await this.em.populate(entity, ['debt']);
        await assertJarAllowsOutflow(this.em, jarId, entity.amount);
        entity.jar = this.em.getReference(Jar, jarId);
        entity.category = categoryId ? this.em.getReference(Category, categoryId) : null;
        entity.status = TransactionStatus.SORTED;
        entity.appliedMerchantKey = null;

        if (createRule) {
            const counterparty = entity.counterparty?.trim() ?? '';
            const description = entity.description.trim();
            const merchant = await this.merchants.matchFeed({
                text: `${counterparty} ${description}`,
            });
            const needle = merchant?.matching?.matchValue.trim() ?? '';
            let field: 'COUNTERPARTY' | 'DESCRIPTION' = counterparty
                ? 'COUNTERPARTY'
                : 'DESCRIPTION';
            let matchValue = counterparty || description;
            // Prefer the catalog needle when it is specific enough to be a rule.
            // Short brands (NS, ING) stay on the raw counterparty — a CONTAINS rule
            // of two letters would swallow unrelated descriptions.
            if (needle.length >= 4) {
                if (containsWord(description, needle)) {
                    field = 'DESCRIPTION';
                    matchValue = needle;
                } else if (containsWord(counterparty, needle)) {
                    field = 'COUNTERPARTY';
                    matchValue = needle;
                }
            }
            const rule = await this.rules.create({
                field,
                matcher: 'CONTAINS',
                matchValue,
                jarId,
                categoryId: categoryId ?? null,
                priority: 100,
                isActive: true,
            });
            entity.appliedRule = rule.id;
        }

        if (debtId !== undefined) {
            await applyDebtLinkChange(this.em, entity, debtId);
        }

        await this.em.flush();
        return toDto(entity);
    }

    async bulkSort(ids: string[], jarId: string, categoryId?: string | null) {
        const rows = await this.transactions.find({ id: { $in: ids } });
        if (rows.some(row => row.amount < 0)) {
            await assertJarAllowsOutflow(this.em, jarId, -1);
        }
        for (const row of rows) {
            row.jar = this.em.getReference(Jar, jarId);
            row.category = categoryId ? this.em.getReference(Category, categoryId) : null;
            row.status = TransactionStatus.SORTED;
            row.appliedMerchantKey = null;
        }
        await this.em.flush();
        return { updated: rows.length };
    }

    async update(
        id: string,
        patch: Partial<
            Pick<Transaction, 'description' | 'amount' | 'note' | 'status' | 'counterparty'>
        > & { categoryId?: string | null; inflowKey?: string | null; debtId?: string | null }
    ) {
        const entity = await this.transactions.findOneOrFail({ id });
        await this.em.populate(entity, ['debt']);
        const { categoryId, inflowKey, debtId, ...fields } = patch;
        Object.assign(entity, fields);
        if (categoryId !== undefined) {
            entity.category = categoryId ? this.em.getReference(Category, categoryId) : null;
        }
        if (entity.amount <= 0) {
            entity.inflowKey = null;
        } else if (inflowKey !== undefined) {
            entity.inflowKey = inflowKey?.trim() || null;
        }
        if (debtId !== undefined) {
            await applyDebtLinkChange(this.em, entity, debtId);
        }
        await this.em.flush();
        return toDto(entity);
    }

    // ====================================================================
    // ? DELETE Operations
    // ====================================================================

    async remove(id: string) {
        const entity = await this.transactions.findOneOrFail({ id });
        await this.em.populate(entity, ['debt']);
        if (entity.debt) {
            await applyDebtLinkChange(this.em, entity, null);
        }
        await this.em.remove(entity).flush();
    }
}

async function assertJarAllowsOutflow(em: EntityManager, jarId: string, amount: number) {
    if (amount >= 0) return;
    const jar = await em.findOneOrFail(Jar, jarId);
    if (!jarCapabilitiesFor(jar.key).canSpend) {
        throw new BadRequestException(
            'Day-to-day spend cannot land on Financial Freedom. Move money or invest instead.'
        );
    }
}

export function toDto(transaction: Transaction) {
    return {
        id: transaction.id,
        householdId: transaction.household,
        accountId: transaction.account?.id ?? null,
        jarId: transaction.jar?.id ?? null,
        categoryId: transaction.category?.id ?? null,
        debtId: transaction.debt?.id ?? null,
        amount: transaction.amount,
        bookedOn: transaction.bookedOn,
        description: transaction.description,
        counterparty: transaction.counterparty,
        inflowKey: transaction.inflowKey,
        status: transaction.status,
        source: transaction.source,
        appliedRuleId: transaction.appliedRule,
        appliedMerchantKey: transaction.appliedMerchantKey,
        note: transaction.note,
        createdAt: transaction.createdAt.toISOString(),
    };
}

/** Stable across re-imports so the same statement never duplicates rows. */
function dedupeKey(
    accountId: string | null,
    bookedOn: string,
    amount: number,
    description: string
) {
    return createHash('sha256')
        .update(
            [accountId ?? '', bookedOn, String(amount), description.trim().toLowerCase()].join('|')
        )
        .digest('hex')
        .slice(0, 64);
}
