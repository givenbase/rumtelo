import { EntityManager } from '@mikro-orm/postgresql';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';

import { HouseholdScopedRepository } from '../../../../../../common/household/household-scoped.repository';
import { currentHouseholdId } from '../../../../../../common/household/household.context';
import { Category } from '../../plan/jar/category.entity';
import { Jar } from '../../plan/jar/jar.entity';
import { BankAccount } from '../account/bank-account.entity';
import { RuleService } from '../rule/rule.service';
import { parseStatementCsv } from './csv/csv-parser';
import { jarCapabilitiesFor, TransactionSource, TransactionStatus } from '@rumtelo/contracts';

import { Transaction } from './transaction.entity';

@Injectable()
export class TransactionService {
    private readonly transactions: HouseholdScopedRepository<Transaction>;

    constructor(
        @Inject(EntityManager) private readonly em: EntityManager,
        @Inject(RuleService) private readonly rules: RuleService
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
            amount: input.amount,
            bookedOn: input.bookedOn,
            description: input.description,
            counterparty: input.counterparty ?? null,
            inflowKey: input.amount > 0 ? input.inflowKey?.trim() || null : null,
            note: input.note ?? null,
            status: input.jarId ? TransactionStatus.SORTED : TransactionStatus.INBOX,
            source: TransactionSource.MANUAL,
            dedupeKey: dedupeKey(
                input.accountId ?? null,
                input.bookedOn,
                input.amount,
                input.description
            ),
        } as never);
        await this.em.persist(entity).flush();
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

        if (!dryRun) {
            parsed.forEach((row, i) => {
                if (seen.has(keys[i]!)) return;
                this.em.create(Transaction, {
                    household: currentHouseholdId(),
                    account: this.em.getReference(BankAccount, accountId),
                    amount: row.amount,
                    bookedOn: row.bookedOn,
                    description: row.description,
                    counterparty: row.counterparty,
                    status: TransactionStatus.INBOX,
                    source: TransactionSource.CSV,
                    dedupeKey: keys[i]!,
                } as never);
            });
            await this.em.flush();
        }

        return {
            detected: parsed.length,
            duplicates: parsed.length - freshCount,
            willImport: freshCount,
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

    async list(filter: { status?: string | null; jarId?: string | null; limit: number }) {
        const where: Record<string, unknown> = {};
        if (filter.status) where.status = filter.status;
        if (filter.jarId) where.jar = filter.jarId;

        const rows = await this.transactions.find(where, {
            orderBy: { bookedOn: 'DESC' },
            limit: filter.limit + 1,
        });
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
        createRule = false
    ) {
        const entity = await this.transactions.findOneOrFail({ id: transactionId });
        await assertJarAllowsOutflow(this.em, jarId, Number(entity.amount));
        entity.jar = this.em.getReference(Jar, jarId);
        entity.category = categoryId ? this.em.getReference(Category, categoryId) : null;
        entity.status = TransactionStatus.SORTED;

        if (createRule) {
            const value = (entity.counterparty?.trim() || entity.description).trim();
            const field = entity.counterparty?.trim() ? 'COUNTERPARTY' : 'DESCRIPTION';
            const rule = await this.rules.create({
                field,
                matcher: 'CONTAINS',
                value,
                jarId,
                categoryId: categoryId ?? null,
                priority: 100,
                isActive: true,
            });
            entity.appliedRuleId = rule.id;
        }

        await this.em.flush();
        return toDto(entity);
    }

    async bulkSort(ids: string[], jarId: string, categoryId?: string | null) {
        const rows = await this.transactions.find({ id: { $in: ids } });
        if (rows.some(row => Number(row.amount) < 0)) {
            await assertJarAllowsOutflow(this.em, jarId, -1);
        }
        for (const row of rows) {
            row.jar = this.em.getReference(Jar, jarId);
            row.category = categoryId ? this.em.getReference(Category, categoryId) : null;
            row.status = TransactionStatus.SORTED;
        }
        await this.em.flush();
        return { updated: rows.length };
    }

    async update(
        id: string,
        patch: Partial<
            Pick<Transaction, 'description' | 'amount' | 'note' | 'status' | 'counterparty'>
        > & { categoryId?: string | null; inflowKey?: string | null }
    ) {
        const entity = await this.transactions.findOneOrFail({ id });
        const { categoryId, inflowKey, ...fields } = patch;
        Object.assign(entity, fields);
        if (categoryId !== undefined) {
            entity.category = categoryId ? this.em.getReference(Category, categoryId) : null;
        }
        if (Number(entity.amount) <= 0) {
            entity.inflowKey = null;
        } else if (inflowKey !== undefined) {
            entity.inflowKey = inflowKey?.trim() || null;
        }
        await this.em.flush();
        return toDto(entity);
    }

    // ====================================================================
    // ? DELETE Operations
    // ====================================================================

    async remove(id: string) {
        const entity = await this.transactions.findOneOrFail({ id });
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
        amount: Number(transaction.amount),
        bookedOn: transaction.bookedOn,
        description: transaction.description,
        counterparty: transaction.counterparty,
        inflowKey: transaction.inflowKey,
        status: transaction.status,
        source: transaction.source,
        appliedRuleId: transaction.appliedRuleId,
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
