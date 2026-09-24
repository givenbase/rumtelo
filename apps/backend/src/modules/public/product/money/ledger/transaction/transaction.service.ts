import { EntityManager } from '@mikro-orm/postgresql';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';

import { containsWord } from '@rumtelo/utils';
import { apiBadRequest } from '../../../../../../common/errors/api-user-error';
import { HouseholdScopedRepository } from '../../../../../../common/household/household-scoped.repository';
import { currentHouseholdId } from '../../../../../../common/household/household.context';
import { MerchantPresetService } from '../../../../../backoffice/product/money/preset/merchant/merchant.service';
import { Category } from '../../plan/jar/category.entity';
import { Jar } from '../../plan/jar/jar.entity';
import { applyDebtLinkChange } from '../../targets/debt/debt-link.util';
import {
    applyFixedCostLinkChange,
    clearFixedCostLinkOnTransaction,
} from '../../plan/fixed-cost/fixed-cost-link.util';
import { BankAccount } from '../bank-account/bank-account.entity';
import { SortRuleService } from '../sort-rule/sort-rule.service';
import { csvDialectMismatchesBank, parseStatement } from './statement/parse-statement';
import type { StatementFormat } from './statement/parsed-row';
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
        fixedCostId?: string | null;
        amount: number;
        bookedOn: string;
        description: string;
        counterparty?: string | null;
        inflowKey?: string | null;
        note?: string | null;
    }) {
        if (input.debtId && input.fixedCostId) {
            throw new BadRequestException(
                'Link either a debt or a fixed cost on one transaction, not both.'
            );
        }
        if (input.jarId) {
            await assertJarAllowsOutflow(this.em, input.jarId, input.amount);
        }
        const entity = this.em.create(Transaction, {
            household: currentHouseholdId(),
            account: input.accountId ? this.em.getReference(BankAccount, input.accountId) : null,
            jar: input.jarId ? this.em.getReference(Jar, input.jarId) : null,
            category: input.categoryId ? this.em.getReference(Category, input.categoryId) : null,
            debt: null,
            fixedCost: null,
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
        if (input.fixedCostId) {
            await applyFixedCostLinkChange(this.em, entity, input.fixedCostId);
            await this.em.flush();
        }

        return toDto(entity);
    }

    /**
     * Statement file import (CSV / MT940 / CAMT.053). Idempotent via dedupeKey.
     * Prefer CAMT.053 when the bank offers it; format sniff is automatic.
     */
    async importCsv(
        accountId: string,
        content: string,
        dryRun: boolean,
        format: StatementFormat | 'auto' = 'auto',
        fileName?: string | null
    ) {
        const account = await this.em.findOne(
            BankAccount,
            { id: accountId },
            { populate: ['bank'] }
        );
        if (!account) throw apiBadRequest('bank_not_found');

        const {
            rows: parsed,
            format: resolvedFormat,
            csvDialect,
        } = parseStatement(content, format, fileName);
        const accountMismatch = csvDialectMismatchesBank(csvDialect, account.bank.key);
        if (accountMismatch && !dryRun) {
            throw apiBadRequest('statement_bank_mismatch');
        }

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
        if (dryRun || accountMismatch) {
            // Dry-run (or blocked mismatch): count rule hits without writing.
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
            willImport: accountMismatch ? 0 : freshCount,
            sorted: accountMismatch ? 0 : sorted,
            sample: incoming.slice(0, 5).map(row => row.counterparty?.trim() || row.description),
            format: resolvedFormat,
            csvDialect,
            accountMismatch,
        };
    }

    /**
     * AIS pull — same Inbox + dedupe shape as CSV, source BANK.
     * `externalId` is folded into the hash so provider ids stay stable.
     */
    async importBankTransactions(
        accountId: string,
        rows: Array<{
            externalId: string;
            bookedOn: string;
            amount: number;
            description: string;
            counterparty: string | null;
        }>
    ) {
        const keys = rows.map(row =>
            dedupeKey(accountId, row.bookedOn, row.amount, `${row.externalId}|${row.description}`)
        );

        const existing = keys.length
            ? await this.transactions.find({ dedupeKey: { $in: keys } })
            : [];
        const seen = new Set(existing.map(transaction => transaction.dedupeKey));
        const incoming: Array<{
            externalId: string;
            bookedOn: string;
            amount: number;
            description: string;
            counterparty: string | null;
            dedupeKey: string;
        }> = [];

        rows.forEach((row, index) => {
            const key = keys[index]!;
            if (seen.has(key)) return;
            seen.add(key);
            incoming.push({ ...row, dedupeKey: key });
        });

        const created = incoming.map(row =>
            this.em.create(Transaction, {
                household: currentHouseholdId(),
                account: this.em.getReference(BankAccount, accountId),
                amount: row.amount,
                bookedOn: row.bookedOn,
                description: row.description,
                counterparty: row.counterparty,
                status: TransactionStatus.INBOX,
                source: TransactionSource.BANK,
                dedupeKey: row.dedupeKey,
            } as never)
        );
        const sorted = await this.rules.autoSort(created, { countHits: true });
        await this.em.flush();

        return {
            imported: incoming.length,
            skipped: rows.length - incoming.length,
            sorted,
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
        await this.em.populate(rows, ['debt', 'fixedCost']);
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
        debtId?: string | null,
        fixedCostId?: string | null
    ) {
        if (debtId && fixedCostId) {
            throw new BadRequestException(
                'Link either a debt or a fixed cost on one transaction, not both.'
            );
        }
        const entity = await this.transactions.findOneOrFail({ id: transactionId });
        await this.em.populate(entity, ['debt', 'fixedCost']);
        await assertJarAllowsOutflow(this.em, jarId, entity.amount);
        entity.jar = this.em.getReference(Jar, jarId);
        entity.category = categoryId ? this.em.getReference(Category, categoryId) : null;
        entity.status = TransactionStatus.SORTED;
        entity.appliedMerchantKey = null;

        const counterparty = entity.counterparty?.trim() ?? '';
        const description = entity.description.trim();
        const merchant = await this.merchants.matchFeed({
            text: `${counterparty} ${description}`,
        });
        const needle = merchant?.matching?.matchValue.trim() ?? '';
        let field: 'COUNTERPARTY' | 'DESCRIPTION' = counterparty ? 'COUNTERPARTY' : 'DESCRIPTION';
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

        // Always learn the payee (Juist = soft memory, Altijd dit = explicit rule).
        const hint = await this.rules.upsertPayeeHint({
            field,
            matchValue,
            jarId,
            categoryId: categoryId ?? null,
            explicit: createRule,
        });
        if (hint) entity.appliedRule = hint.id;

        if (debtId !== undefined) {
            if (entity.fixedCost && debtId) {
                await applyFixedCostLinkChange(this.em, entity, null);
            }
            await applyDebtLinkChange(this.em, entity, debtId);
        }

        if (fixedCostId !== undefined) {
            if (entity.debt && fixedCostId) {
                await applyDebtLinkChange(this.em, entity, null);
            }
            await applyFixedCostLinkChange(this.em, entity, fixedCostId);
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
        > & {
            categoryId?: string | null;
            inflowKey?: string | null;
            debtId?: string | null;
            fixedCostId?: string | null;
        }
    ) {
        const entity = await this.transactions.findOneOrFail({ id });
        await this.em.populate(entity, ['debt', 'fixedCost']);
        const { categoryId, inflowKey, debtId, fixedCostId, ...fields } = patch;

        if (debtId && fixedCostId) {
            throw new BadRequestException(
                'Link either a debt or a fixed cost on one transaction, not both.'
            );
        }

        Object.assign(entity, fields);
        if (categoryId !== undefined) {
            entity.category = categoryId ? this.em.getReference(Category, categoryId) : null;
        }
        if (entity.amount <= 0) {
            entity.inflowKey = null;
        } else if (inflowKey !== undefined) {
            entity.inflowKey = inflowKey?.trim() || null;
        }
        if (fields.status === TransactionStatus.IGNORED && entity.fixedCost) {
            await clearFixedCostLinkOnTransaction(this.em, entity);
        }
        if (debtId !== undefined) {
            if (entity.fixedCost && debtId) {
                await applyFixedCostLinkChange(this.em, entity, null);
            }
            await applyDebtLinkChange(this.em, entity, debtId);
        }
        if (fixedCostId !== undefined) {
            if (entity.debt && fixedCostId) {
                await applyDebtLinkChange(this.em, entity, null);
            }
            await applyFixedCostLinkChange(this.em, entity, fixedCostId);
        }
        await this.em.flush();
        return toDto(entity);
    }

    // ====================================================================
    // ? DELETE Operations
    // ====================================================================

    async remove(id: string) {
        const entity = await this.transactions.findOneOrFail({ id });
        await this.em.populate(entity, ['debt', 'fixedCost']);
        if (entity.debt) {
            await applyDebtLinkChange(this.em, entity, null);
        }
        if (entity.fixedCost) {
            await clearFixedCostLinkOnTransaction(this.em, entity);
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
        fixedCostId: transaction.fixedCost?.id ?? null,
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
