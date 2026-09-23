import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable, Logger } from '@nestjs/common';

import { BANK_SYNC_OAUTH_CALLBACK_PATH } from '@rumtelo/contracts/money';
import { normalizeIban } from '@rumtelo/utils';

import {
    BANKING_PORT,
    type BankingPort,
    encodeConnectionId,
} from '../../../../../../banking/banking.port';
import { PlanAccessService } from '../../../../../../common/capability';
import { loadEnv } from '../../../../../../common/config/env.config';
import { apiBadRequest, apiUnavailable } from '../../../../../../common/errors/api-user-error';
import { householdStorage } from '../../../../../../common/household/household.context';
import { HouseholdScopedRepository } from '../../../../../../common/household/household-scoped.repository';
import { BankAccount } from '../bank-account/bank-account.entity';
import { TransactionService } from '../transaction/transaction.service';
import { BANK_SYNC_INITIAL_LOOKBACK_DAYS, BANK_SYNC_STALE_MS } from './bank-sync.constants';

@Injectable()
export class BankSyncService {
    private readonly logger = new Logger(BankSyncService.name);
    private readonly accounts: HouseholdScopedRepository<BankAccount>;

    constructor(
        @Inject(EntityManager) private readonly em: EntityManager,
        @Inject(BANKING_PORT) private readonly banking: BankingPort,
        @Inject(TransactionService) private readonly transactions: TransactionService,
        @Inject(PlanAccessService) private readonly planAccess: PlanAccessService
    ) {
        this.accounts = new HouseholdScopedRepository(em, BankAccount);
    }

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    async startLink(input: { bankAccountId: string; institutionId: string }) {
        this.requireEnabled();
        const account = await this.accounts.findOneOrFail({ id: input.bankAccountId });
        await this.assertBankLinkCapacity(account);
        const redirectUrl = `${loadEnv().DOMAIN_APP.replace(/\/$/, '')}${BANK_SYNC_OAUTH_CALLBACK_PATH}`;
        try {
            const { authUrl } = await this.banking.startLink({
                institutionId: input.institutionId,
                redirectUrl,
                state: account.id,
            });
            return { authUrl };
        } catch (error) {
            const detail = String(error);
            this.logger.error(`startLink failed (redirectUrl=${redirectUrl}): ${detail}`);
            if (/REDIRECT_URI_NOT_ALLOWED|Redirect URI not allowed/i.test(detail)) {
                throw apiBadRequest('bank_sync_redirect_not_allowed');
            }
            throw apiBadRequest('bank_sync_failed');
        }
    }

    async completeLink(input: { code: string; state: string }) {
        this.requireEnabled();
        const account = await this.accounts.findOneOrFail({ id: input.state });
        await this.assertBankLinkCapacity(account);
        let link;
        try {
            link = await this.banking.completeLink({ code: input.code, state: input.state });
        } catch (error) {
            this.logger.error(`completeLink failed account=${account.id}: ${String(error)}`);
            throw apiBadRequest('bank_sync_failed');
        }

        const matched = pickAccount(link.accounts, account.iban);
        if (!matched) throw apiBadRequest('bank_sync_failed');

        account.connectionId = encodeConnectionId(link.sessionId, matched.uid);
        account.lastSyncedAt = null;
        if (!account.iban && matched.iban) {
            account.iban = normalizeIban(matched.iban);
        }
        await this.em.flush();

        return {
            bankAccountId: account.id,
            connectionId: account.connectionId,
            institutionName: link.institutionName,
            expiresAt: link.expiresAt,
        };
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    async status() {
        const enabled = this.banking.isEnabled();
        if (!enabled) return { enabled: false, connectedAccountIds: [] as string[] };
        const rows = await this.accounts.find();
        return {
            enabled: true,
            connectedAccountIds: rows.filter(row => Boolean(row.connectionId)).map(row => row.id),
        };
    }

    async listInstitutions(country?: string | null) {
        this.requireEnabled();
        const code = (country?.trim() || 'NL').toUpperCase();
        try {
            return await this.banking.listInstitutions(code);
        } catch {
            throw apiBadRequest('bank_sync_failed');
        }
    }

    // ====================================================================
    // ? UPDATE Operations
    // ====================================================================

    async syncNow(bankAccountId: string) {
        this.requireEnabled();
        const account = await this.accounts.findOneOrFail({ id: bankAccountId });
        if (!account.connectionId) throw apiBadRequest('bank_sync_failed');
        return this.pullAccount(account);
    }

    /**
     * Opportunistic pull for the current household — only seats older than
     * {@link BANK_SYNC_STALE_MS}. Safe no-op when bank sync is off.
     */
    async syncStale() {
        if (!this.banking.isEnabled()) return { synced: 0, imported: 0 };
        const rows = (await this.accounts.find()).filter(row => row.connectionId);
        const stale = rows.filter(row => isStale(row.lastSyncedAt, BANK_SYNC_STALE_MS));
        let imported = 0;
        let synced = 0;
        for (const account of stale) {
            try {
                const result = await this.pullAccount(account);
                imported += result.imported;
                synced += 1;
            } catch (error) {
                this.logger.warn(`syncStale failed for account ${account.id}: ${String(error)}`);
            }
        }
        return { synced, imported };
    }

    /**
     * Cron entry — walks every linked seat across households. Each pull runs
     * inside {@link householdStorage} so scoped repos stay honest.
     */
    async syncAllLinkedForCron() {
        if (!this.banking.isEnabled()) {
            this.logger.debug('Bank sync cron skipped — FEATURE_BANK_SYNC off');
            return;
        }

        const linked = await this.em.find(BankAccount, {
            connectionId: { $ne: null },
        });
        const due = linked.filter(row => isStale(row.lastSyncedAt, BANK_SYNC_STALE_MS));
        this.logger.log(`Bank sync cron: ${due.length}/${linked.length} seats due`);

        for (const account of due) {
            await householdStorage.run(
                {
                    userId: 'system:bank-sync',
                    householdId: account.household,
                    role: 'OWNER',
                },
                async () => {
                    try {
                        await this.pullAccount(account);
                    } catch (error) {
                        this.logger.warn(
                            `cron sync failed household=${account.household} account=${account.id}: ${String(error)}`
                        );
                    }
                }
            );
        }
    }

    // ====================================================================
    // ? DELETE Operations
    // ====================================================================

    async disconnect(bankAccountId: string) {
        this.requireEnabled();
        const account = await this.accounts.findOneOrFail({ id: bankAccountId });
        if (account.connectionId) {
            await this.banking.disconnect(account.connectionId);
            account.connectionId = null;
            account.lastSyncedAt = null;
            await this.em.flush();
        }
        return { ok: true as const };
    }

    private async pullAccount(account: BankAccount) {
        if (!account.connectionId) throw apiBadRequest('bank_sync_failed');

        const lookbackSince = new Date(
            Date.now() - BANK_SYNC_INITIAL_LOOKBACK_DAYS * 24 * 60 * 60 * 1000
        )
            .toISOString()
            .slice(0, 10);
        const firstPull = !account.lastSyncedAt;
        const since = firstPull
            ? lookbackSince
            : (account.lastSyncedAt!.toISOString().slice(0, 10) ?? lookbackSince);

        try {
            const balance = await this.banking.fetchBalance(account.connectionId);
            if (balance !== null) account.balance = balance;
        } catch (error) {
            this.logger.warn(`fetchBalance failed account=${account.id}: ${String(error)}`);
        }

        let rows;
        try {
            // EB FAQ: longest on first/catch-up; default for incremental.
            rows = await this.banking.fetchTransactions(account.connectionId, since, {
                strategy: firstPull ? 'longest' : 'default',
            });
            // Incremental empty → one longest catch-up (period quirks / empty+continuation).
            if (!firstPull && rows.length === 0) {
                rows = await this.banking.fetchTransactions(account.connectionId, lookbackSince, {
                    strategy: 'longest',
                });
            }
        } catch (error) {
            this.logger.error(`fetchTransactions failed account=${account.id}: ${String(error)}`);
            throw apiBadRequest('bank_sync_failed');
        }

        const result = await this.transactions.importBankTransactions(account.id, rows);
        account.lastSyncedAt = new Date();
        await this.em.flush();
        if (result.imported === 0 && rows.length === 0) {
            this.logger.warn(
                `sync imported 0 account=${account.id} — if consent predates balances/transactions scopes, reconnect the bank`
            );
        }
        return result;
    }

    private requireEnabled() {
        if (!this.banking.isEnabled()) throw apiUnavailable('bank_sync_disabled');
    }

    /** New live links consume a plan seat; re-consent on an already-linked seat does not. */
    private async assertBankLinkCapacity(account: BankAccount) {
        if (account.connectionId) return;
        const occupied = await this.accounts.count({ connectionId: { $ne: null } });
        await this.planAccess.assertWithinLimit('maxBankLinks', occupied);
    }
}

function isStale(lastSyncedAt: Date | null, maxAgeMs: number): boolean {
    if (!lastSyncedAt) return true;
    return Date.now() - lastSyncedAt.getTime() >= maxAgeMs;
}

function pickAccount(
    accounts: Array<{ uid: string; iban: string | null; name: string | null }>,
    seatIban: string | null
) {
    if (accounts.length === 0) return null;
    if (!seatIban) return accounts[0]!;
    const needle = normalizeIban(seatIban);
    const hit = accounts.find(row => row.iban && normalizeIban(row.iban) === needle);
    return hit ?? accounts[0]!;
}
