/**
 * Restore a Rumtelo JSON household export into the current household.
 * Remaps jars by JarKey (a pot this household has not turned on goes to its group's main pot); skips plan-gated / duplicate rows; dry-run by default.
 * The real run is one database transaction: every section is written or none is.
 */

import { createHash } from 'node:crypto';

import { isValidIban, normalizeIban } from '@rumtelo/utils';
import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';

import {
    AccountKind,
    CAPABILITIES,
    GoalKind,
    GoalStatus,
    TransactionSource,
    TransactionStatus,
    hasCapability,
    type ArchiveRestorePayload,
    type ArchiveRestoreResult,
    type ArchiveSectionCounts,
    JarKey,
    resolveJarKeyForHousehold,
} from '@rumtelo/contracts';

import { PlanAccessService } from '../../../../../common/capability';
import { apiBadRequest } from '../../../../../common/errors/api-user-error';
import { checkJarSplit } from '../../../../../common/utils/jar-split.util';
import { currentHouseholdId } from '../../../../../common/household/household.context';
import { HouseholdScopedRepository } from '../../../../../common/household/household-scoped.repository';
import { HouseholdSettingsService } from '../../../../auth/household/household-settings/household-settings.service';
import { AccountSettingsService } from '../../../../auth/user/account/account-settings/account-settings.service';
import { Bank } from '../../../../backoffice/product/money/catalog/bank/bank.entity';
import { Asset } from '../../growth/asset/asset.entity';
import { DebtService } from '../targets/debt/debt.service';
import { GoalService } from '../targets/goal/goal.service';
import { BankAccountService } from '../ledger/bank-account/bank-account.service';
import { FixedCostService } from '../plan/fixed-cost/fixed-cost.service';
import { IncomeService } from '../plan/income/income.service';
import { Jar } from '../plan/jar/jar.entity';
import { JarService } from '../plan/jar/jar.service';
import { PartyService } from '../plan/party/party.service';
import { SortRuleService } from '../ledger/sort-rule/sort-rule.service';
import { Transaction } from '../ledger/transaction/transaction.entity';
import {
    assertDueMonthFits,
    assertSettlementTarget,
    normalizeArchiveName,
} from './archive-rules.util';

const emptySection = (): ArchiveSectionCounts => ({
    willImport: 0,
    skipped: 0,
    skippedPlan: 0,
});

@Injectable()
export class ArchiveService {
    private readonly transactions: HouseholdScopedRepository<Transaction>;
    private readonly assets: HouseholdScopedRepository<Asset>;

    constructor(
        @Inject(EntityManager) private readonly em: EntityManager,
        @Inject(PlanAccessService) private readonly planAccess: PlanAccessService,
        @Inject(JarService) private readonly jars: JarService,
        @Inject(PartyService) private readonly parties: PartyService,
        @Inject(IncomeService) private readonly income: IncomeService,
        @Inject(FixedCostService) private readonly fixedCosts: FixedCostService,
        @Inject(DebtService) private readonly debts: DebtService,
        @Inject(GoalService) private readonly goals: GoalService,
        @Inject(SortRuleService) private readonly rules: SortRuleService,
        @Inject(BankAccountService) private readonly accounts: BankAccountService,
        @Inject(HouseholdSettingsService)
        private readonly householdSettings: HouseholdSettingsService,
        @Inject(AccountSettingsService) private readonly accountSettings: AccountSettingsService
    ) {
        this.transactions = new HouseholdScopedRepository(em, Transaction);
        this.assets = new HouseholdScopedRepository(em, Asset);
    }

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    /**
     * Preview (`dryRun`) or apply an archive. Both modes walk the same pass, so the preview
     * refuses what the real run refuses; only the writes differ. The real run is one
     * transaction: a service that rejects a row in a late section (income, debts, bills,
     * goals) rolls back everything written before it, instead of leaving a half-restored
     * board. Services called from it open their own `em.transactional` (the pot split's row
     * lock); MikroORM turns those into savepoints inside this transaction.
     */
    restore(input: {
        payload: ArchiveRestorePayload;
        dryRun: boolean;
        applyJarSplit: boolean;
        applySettings: boolean;
    }): Promise<ArchiveRestoreResult> {
        if (input.dryRun) return this.restorePass(input);
        return this.em.transactional(() => this.restorePass(input));
    }

    // ====================================================================
    // ? Helpers
    // ====================================================================

    /** The whole restore: validates and counts every section, and writes unless `dryRun`. */
    private async restorePass(input: {
        payload: ArchiveRestorePayload;
        dryRun: boolean;
        applyJarSplit: boolean;
        applySettings: boolean;
    }): Promise<ArchiveRestoreResult> {
        const { payload, dryRun, applyJarSplit, applySettings } = input;
        const warnings: string[] = [];
        const sample: string[] = [];
        const planKey = await this.planAccess.planKeyForCurrentHousehold();
        const canDebt = hasCapability(CAPABILITIES.moneyDebt, planKey);
        const canGoals = hasCapability(CAPABILITIES.growthGoals, planKey);
        const householdId = currentHouseholdId();

        // Decide the jar split before anything is written: the same rule `updateSplit`
        // enforces (`checkJarSplit`) runs here, in the dry run too, and a bad split is skipped
        // with a warning instead of aborting the import.
        const localJars = await this.jars.list();
        const localKeyToId = new Map(localJars.map(jar => [jar.key, jar.id]));
        const localKeys = new Set(localKeyToId.keys());
        const billJarIds = new Set(
            localJars.filter(jar => jar.capabilities.allowsFixedCosts).map(jar => jar.id)
        );
        let splitRows: Array<{ jarId: string; percentage: number }> | null = null;
        if (applyJarSplit && payload.jars.length > 0) {
            const checked = checkJarSplit(
                localJars,
                payload.jars.map(jar => ({ key: jar.key, percentage: jar.percentage }))
            );
            if (checked.ok) {
                splitRows = checked.shares.map(share => ({
                    jarId: localKeyToId.get(share.key)!,
                    percentage: share.percentage,
                }));
            } else {
                warnings.push(
                    checked.reason === 'jar_split_keys'
                        ? 'jar_split_incomplete'
                        : 'jar_split_not_100'
                );
            }
        }

        const settingsCounts = emptySection();
        const accountSettingsCounts = emptySection();
        if (applySettings && payload.settings) {
            const patch = { ...payload.settings };
            const hasPatch =
                patch.why !== undefined ||
                patch.currency !== undefined ||
                patch.money !== undefined ||
                patch.weekCheck !== undefined ||
                patch.features !== undefined ||
                patch.answers !== undefined ||
                patch.audienceKeys !== undefined;
            if (hasPatch) {
                settingsCounts.willImport = 1;
                if (!dryRun) {
                    await this.householdSettings.update(householdId, patch);
                }
            } else {
                settingsCounts.skipped = 1;
            }
        }

        if (applySettings && payload.accountSettings) {
            const { locale, theme, spendingStyle } = payload.accountSettings;
            const hasPatch =
                locale !== undefined || theme !== undefined || spendingStyle !== undefined;
            if (hasPatch) {
                accountSettingsCounts.willImport = 1;
                if (!dryRun) {
                    await this.accountSettings.update({ locale, theme, spendingStyle });
                }
            } else {
                accountSettingsCounts.skipped = 1;
            }
        }

        const partyCounts = emptySection();
        const existingParties = await this.parties.list();
        const partyNames = new Set(
            existingParties.map(row => normalizeArchiveName(row.name).toLowerCase())
        );
        for (const row of payload.parties) {
            // The same form `PartyService` stores, so a name it would call taken is skipped here.
            const name = normalizeArchiveName(row.name);
            if (!name || partyNames.has(name.toLowerCase())) {
                partyCounts.skipped += 1;
                continue;
            }
            partyCounts.willImport += 1;
            partyNames.add(name.toLowerCase());
            if (!dryRun) {
                await this.parties.create({
                    name,
                    note: row.note ?? null,
                    aliases: row.aliases ?? [],
                    merchantKey: row.merchantKey ?? null,
                    color: row.color ?? null,
                    icon: row.icon ?? null,
                    logoDomain: row.logoDomain ?? null,
                    website: row.website ?? null,
                });
            }
        }

        const accountCounts = emptySection();
        const settlementLinks: Array<{ accountName: string; settlementName: string }> = [];
        const pendingSettlements: Array<{ accountId: string; settlementName: string }> = [];
        if (payload.accounts.length > 0) {
            const existingAccounts = await this.accounts.list();
            const accountNames = new Set(existingAccounts.map(row => row.name.toLowerCase()));
            // Kind by name, for the settlement check: the accounts already there plus the ones imported.
            const accountKinds = new Map(
                existingAccounts.map(row => [row.name.trim().toLowerCase(), row.kind])
            );
            const accountIbans = new Set(
                existingAccounts
                    .map(row => row.iban)
                    .filter((iban): iban is string => Boolean(iban))
            );
            const bankKeys = [
                ...new Set(
                    payload.accounts
                        .map(row => row.bankKey?.trim())
                        .filter((key): key is string => Boolean(key))
                ),
            ];
            const banks = bankKeys.length
                ? await this.em.find(Bank, { key: { $in: bankKeys }, isActive: true })
                : [];
            const bankIdByKey = new Map(banks.map(bank => [bank.key, bank.id]));

            for (const row of payload.accounts) {
                const name = row.name.trim();
                const bankKey = row.bankKey?.trim() || null;
                // No key = a bankless account (Main account): restore it as is.
                const bankId = bankKey ? (bankIdByKey.get(bankKey) ?? null) : null;
                if (bankKey && !bankId) {
                    accountCounts.skipped += 1;
                    warnings.push(`bank_unknown_key:${bankKey}`);
                    continue;
                }
                const iban = row.iban?.trim() || null;
                // Stored IBANs are in electronic form; compare in that form, as the service does.
                const ibanKey = iban ? normalizeIban(iban) : null;
                if (
                    !name ||
                    accountNames.has(name.toLowerCase()) ||
                    (ibanKey && accountIbans.has(ibanKey))
                ) {
                    accountCounts.skipped += 1;
                    continue;
                }
                if (iban && !isValidIban(iban)) throw apiBadRequest('invalid_iban');
                accountCounts.willImport += 1;
                accountNames.add(name.toLowerCase());
                accountKinds.set(name.toLowerCase(), row.kind);
                if (ibanKey) accountIbans.add(ibanKey);
                if (row.wasConnected) warnings.push('account_reconnect_needed');
                const settlementName = row.settlementAccountName?.trim();
                if (row.kind === AccountKind.CREDIT && settlementName) {
                    settlementLinks.push({ accountName: name, settlementName });
                }
                if (!dryRun) {
                    const created = await this.accounts.create({
                        name,
                        iban,
                        kind: row.kind,
                        balance: row.balance ?? 0,
                        bankId,
                        isPrimary: row.isPrimary,
                    });
                    if (row.kind === AccountKind.CREDIT && settlementName) {
                        pendingSettlements.push({
                            accountId: created.id,
                            settlementName,
                        });
                    }
                }
            }

            // Checked in the dry run too: `BankAccountService.update` refuses a settlement
            // account that is the card itself or not a checking / savings account.
            for (const link of settlementLinks) {
                const targetKind = accountKinds.get(link.settlementName.toLowerCase());
                if (!targetKind) {
                    warnings.push('settlement_account_missing');
                    continue;
                }
                assertSettlementTarget(link.accountName, {
                    name: link.settlementName,
                    kind: targetKind,
                });
            }

            if (!dryRun && pendingSettlements.length > 0) {
                const seats = await this.accounts.list();
                const idByName = new Map(seats.map(seat => [seat.name.toLowerCase(), seat.id]));
                for (const link of pendingSettlements) {
                    const settlementAccountId = idByName.get(link.settlementName.toLowerCase());
                    if (!settlementAccountId) {
                        warnings.push('settlement_account_missing');
                        continue;
                    }
                    await this.accounts.update({
                        id: link.accountId,
                        settlementAccountId,
                    });
                }
            }
        }

        const exportIdToKey = new Map<string, JarKey>();
        for (const jar of payload.jars) {
            if (jar.id) exportIdToKey.set(jar.id, jar.key);
        }

        // A pot the household has not turned on lands in its group's main pot, except with
        // `exact`: a Give pledge measures spending out of its own pot, and on Play it would
        // count every Play euro as given.
        const remapJarId = (
            exportJarId: string | null | undefined,
            exact = false
        ): string | null => {
            if (!exportJarId) return null;
            const key = exportIdToKey.get(exportJarId);
            if (!key) return null;
            return (
                localKeyToId.get(exact ? key : resolveJarKeyForHousehold(key, localKeys)) ?? null
            );
        };

        // Decided here (the dry run reports it), written last: `updateSplit` row-locks every pot
        // until the outer transaction commits, so it goes after the long sections to keep other
        // members' pot writes waiting only briefly. Nothing between here and the end reads the
        // stored percentages or the share history (bills and goals attach to a pot, never to
        // its share), so the order does not change what lands.
        const jarsSplitUpdated = splitRows !== null;

        // Holdings are not restored by the money archive; income / bills relink by
        // name to a holding this household already has (Max plan only).
        const canAssets = hasCapability(CAPABILITIES.growthNetWorth, planKey);
        const localAssets = canAssets ? await this.assets.find({}) : [];
        const localAssetByName = new Map(
            localAssets.map(asset => [asset.name.trim().toLowerCase(), asset.id])
        );
        const exportAssetName = new Map<string, string>();
        for (const asset of payload.assets) {
            if (asset.id) exportAssetName.set(asset.id, asset.name);
        }
        const remapAssetId = (row: {
            assetId?: string | null;
            assetName?: string | null;
        }): string | null => {
            const name =
                row.assetName?.trim() ||
                (row.assetId ? exportAssetName.get(row.assetId) : undefined);
            if (!name) return null;
            const local = localAssetByName.get(name.toLowerCase()) ?? null;
            if (!local) warnings.push('asset_link_unmapped');
            return local;
        };

        const incomeCounts = emptySection();
        const existingIncome = await this.income.list();
        const incomeNames = new Set(existingIncome.map(row => row.name.toLowerCase()));
        for (const row of payload.income) {
            if (incomeNames.has(row.name.toLowerCase())) {
                incomeCounts.skipped += 1;
                continue;
            }
            incomeCounts.willImport += 1;
            incomeNames.add(row.name.toLowerCase());
            const incomeAssetId = remapAssetId(row);
            if (!dryRun) {
                await this.income.create({
                    name: row.name,
                    presetKey: row.presetKey ?? null,
                    counterparty: row.counterparty ?? null,
                    merchantKey: row.merchantKey ?? null,
                    // Relink by name when the export marked a saved party.
                    saveParty: Boolean(row.partyName?.trim()),
                    assetId: incomeAssetId,
                    kind: row.kind,
                    amount: row.amount,
                    cadence: row.cadence,
                    expectedDay: row.expectedDay ?? null,
                    isActive: row.isActive,
                    startedOn: row.startedOn ?? null,
                    endsOn: row.endsOn ?? null,
                });
            }
        }

        const debtCounts = emptySection();
        const debtIdMap = new Map<string, string>();
        if (!canDebt && payload.debts.length > 0) {
            debtCounts.skippedPlan = payload.debts.length;
            warnings.push('debts_skipped_plan');
        } else {
            const existingDebts = canDebt ? await this.debts.list() : [];
            const debtNames = new Set(existingDebts.map(row => row.name.toLowerCase()));
            for (const row of payload.debts) {
                if (debtNames.has(row.name.toLowerCase())) {
                    debtCounts.skipped += 1;
                    const match = existingDebts.find(
                        debt => debt.name.toLowerCase() === row.name.toLowerCase()
                    );
                    if (row.id && match) debtIdMap.set(row.id, match.id);
                    continue;
                }
                // `DebtService.create` refuses a quarterly / yearly debt without a due month.
                assertDueMonthFits(row.paymentCadence, row.dueMonth);
                debtCounts.willImport += 1;
                debtNames.add(row.name.toLowerCase());
                if (!dryRun) {
                    const created = await this.debts.create({
                        name: row.name,
                        presetKey: row.presetKey ?? null,
                        kind: row.kind,
                        balance: row.balance,
                        originalBalance: row.originalBalance,
                        interestRate: row.interestRate,
                        minimumPayment: row.minimumPayment,
                        extraPayment: row.extraPayment,
                        dueDay: row.dueDay ?? null,
                        dueMonth: row.dueMonth ?? null,
                        closedOn: row.closedOn ?? null,
                        startedOn: row.startedOn ?? null,
                        scheduleKind: row.scheduleKind,
                        paymentCadence: row.paymentCadence,
                        termPayments: row.termPayments ?? null,
                        maturityOn: row.maturityOn ?? null,
                        linkFixedCost: false,
                    });
                    if (row.id) debtIdMap.set(row.id, created.id);
                    existingDebts.push(created);
                }
            }
        }

        const fixedCounts = emptySection();
        const existingFixed = await this.fixedCosts.list();
        const fixedKeys = new Set(
            existingFixed.map(row => `${row.name.toLowerCase()}|${row.amount}|${row.jarId}`)
        );
        for (const row of payload.fixedCosts) {
            const jarId = remapJarId(row.jarId);
            // A bill that fell back to a main pot which takes no bills (Education -> Long-term
            // savings) would be refused by `FixedCostService.create`, so it is skipped here like
            // an unmapped jar.
            if (!jarId || !billJarIds.has(jarId)) {
                fixedCounts.skipped += 1;
                warnings.push('fixed_cost_jar_unmapped');
                continue;
            }
            const key = `${row.name.toLowerCase()}|${row.amount}|${jarId}`;
            if (fixedKeys.has(key)) {
                fixedCounts.skipped += 1;
                continue;
            }
            // `FixedCostService.create` refuses a quarterly / yearly bill without a due month.
            assertDueMonthFits(row.cadence, row.dueMonth);
            fixedCounts.willImport += 1;
            fixedKeys.add(key);
            const fixedAssetId = remapAssetId(row);
            if (!dryRun) {
                await this.fixedCosts.create({
                    jarId,
                    name: row.name,
                    presetKey: row.presetKey ?? null,
                    amount: row.amount,
                    cadence: row.cadence,
                    direction: row.direction,
                    debtId: row.debtId ? (debtIdMap.get(row.debtId) ?? null) : null,
                    assetId: fixedAssetId,
                    counterparty: row.counterparty ?? null,
                    dueDay: row.dueDay ?? null,
                    dueMonth: row.dueMonth ?? null,
                    isActive: row.isActive,
                    startedOn: row.startedOn ?? null,
                    endsOn: row.endsOn ?? null,
                    note: row.note ?? null,
                });
            }
        }

        const goalCounts = emptySection();
        if (!canGoals && payload.goals.length > 0) {
            goalCounts.skippedPlan = payload.goals.length;
            warnings.push('goals_skipped_plan');
        } else {
            const existingGoals = canGoals ? await this.goals.list() : [];
            const goalNames = new Set(existingGoals.map(row => row.name.toLowerCase()));
            let occupied = existingGoals.filter(row => row.status === GoalStatus.ACTIVE).length;
            for (const row of payload.goals) {
                if (goalNames.has(row.name.toLowerCase())) {
                    goalCounts.skipped += 1;
                    continue;
                }
                try {
                    await this.planAccess.assertWithinLimit('maxGoals', occupied);
                } catch {
                    goalCounts.skippedPlan += 1;
                    warnings.push('goals_limit_reached');
                    continue;
                }
                // A Give pledge needs the household's own Give pot (`GoalService.create` refuses
                // anything else): skip it.
                const isGive = row.kind === GoalKind.GIVE;
                const goalJarId = remapJarId(row.jarId ?? null, isGive);
                if (isGive && localJars.find(jar => jar.id === goalJarId)?.key !== JarKey.GIVE) {
                    goalCounts.skipped += 1;
                    warnings.push('goal_give_pot_missing');
                    continue;
                }
                goalCounts.willImport += 1;
                goalNames.add(row.name.toLowerCase());
                occupied += 1;
                if (!dryRun) {
                    await this.goals.create({
                        kind: row.kind,
                        jarId: goalJarId,
                        name: row.name,
                        icon: row.icon ?? null,
                        target: row.target,
                        monthlyContribution: row.monthlyContribution,
                        targetOn: row.targetOn ?? null,
                        status: row.status,
                        why: row.why ?? null,
                    });
                }
            }
        }

        const ruleCounts = emptySection();
        const existingRules = await this.rules.list();
        const ruleKeys = new Set(
            existingRules.map(
                row => `${row.field}|${row.matcher}|${row.matchValue.toLowerCase()}|${row.jarId}`
            )
        );
        for (const row of payload.rules) {
            const jarId = remapJarId(row.jarId);
            if (!jarId) {
                ruleCounts.skipped += 1;
                continue;
            }
            const key = `${row.field}|${row.matcher}|${row.matchValue.toLowerCase()}|${jarId}`;
            if (ruleKeys.has(key)) {
                ruleCounts.skipped += 1;
                continue;
            }
            ruleCounts.willImport += 1;
            ruleKeys.add(key);
            if (!dryRun) {
                await this.rules.create({
                    field: row.field,
                    matcher: row.matcher,
                    matchValue: row.matchValue,
                    jarId,
                    categoryId: null,
                    priority: row.priority,
                    isActive: row.isActive,
                });
            }
        }

        const txCounts = emptySection();
        const incomingKeys: string[] = [];
        const prepared: Array<{
            bookedOn: string;
            amount: number;
            description: string;
            counterparty: string | null;
            jarId: string | null;
            note: string | null;
            dedupeKey: string;
        }> = [];
        for (const row of payload.transactions) {
            const key = archiveDedupeKey(row.bookedOn, row.amount, row.description);
            incomingKeys.push(key);
            prepared.push({
                bookedOn: row.bookedOn,
                amount: row.amount,
                description: row.description,
                counterparty: row.counterparty ?? null,
                jarId: remapJarId(row.jarId ?? null),
                note: row.note ?? null,
                dedupeKey: key,
            });
        }
        const existingTx = incomingKeys.length
            ? await this.transactions.find({ dedupeKey: { $in: incomingKeys } })
            : [];
        const seen = new Set(existingTx.map(row => row.dedupeKey));
        for (const row of prepared) {
            if (seen.has(row.dedupeKey)) {
                txCounts.skipped += 1;
                continue;
            }
            seen.add(row.dedupeKey);
            txCounts.willImport += 1;
            if (sample.length < 5) {
                sample.push(row.counterparty?.trim() || row.description);
            }
            if (!dryRun) {
                const entity = this.em.create(Transaction, {
                    household: currentHouseholdId(),
                    account: null,
                    jar: row.jarId ? this.em.getReference(Jar, row.jarId) : null,
                    category: null,
                    debt: null,
                    fixedCost: null,
                    asset: null,
                    amount: row.amount,
                    bookedOn: row.bookedOn,
                    description: row.description,
                    counterparty: row.counterparty,
                    inflowKey: null,
                    note: row.note,
                    status: row.jarId ? TransactionStatus.SORTED : TransactionStatus.INBOX,
                    source: TransactionSource.CSV,
                    dedupeKey: row.dedupeKey,
                    appliedRule: null,
                    appliedMerchantKey: null,
                } as never);
                this.em.persist(entity);
            }
        }
        if (!dryRun && txCounts.willImport > 0) {
            await this.em.flush();
        }

        // Last write: the pot locks are taken here and released a moment later at commit.
        if (!dryRun && splitRows) await this.jars.updateSplit(splitRows);

        return {
            dryRun,
            jarsSplitUpdated,
            settings: settingsCounts,
            accountSettings: accountSettingsCounts,
            parties: partyCounts,
            accounts: accountCounts,
            income: incomeCounts,
            fixedCosts: fixedCounts,
            debts: debtCounts,
            goals: goalCounts,
            rules: ruleCounts,
            transactions: txCounts,
            warnings: [...new Set(warnings)],
            sample,
        };
    }
}

function archiveDedupeKey(bookedOn: string, amount: number, description: string) {
    return createHash('sha256')
        .update(['archive', bookedOn, String(amount), description.trim().toLowerCase()].join('|'))
        .digest('hex')
        .slice(0, 64);
}
