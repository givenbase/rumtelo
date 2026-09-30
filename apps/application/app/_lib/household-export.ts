/**
 * Household data export — paginate live list APIs into CSV / JSON / Excel.
 */

import type {
    Account,
    AccountSettings,
    ArchiveAccountSettings,
    ArchiveBankAccount,
    ArchiveHouseholdSettings,
    Asset,
    Debt,
    FixedCost,
    Goal,
    HouseholdSettings,
    IncomeSource,
    Jar,
    Party,
    Rule,
    Transaction,
} from '@rumtelo/contracts';

import { api } from '@/app/_lib/api';
import { downloadTextFile, downloadZip, toCsv } from '@/app/_lib/download';
import { fromMinorUnits } from '@rumtelo/utils';

const PAGE_LIMIT = 200;
/** Hard stop so a runaway cursor cannot loop forever (~100k txs). */
const MAX_TX_PAGES = 500;

/** Plan-gated sections — skip list calls the household cannot access. */
export type HouseholdExportAccess = {
    includeDebts: boolean;
    includeGoals: boolean;
    /** Net-worth holdings — only so bills / income keep their holding link. */
    includeAssets?: boolean;
};

export type HouseholdExportBundle = {
    exportedAt: string;
    householdId: string;
    access: HouseholdExportAccess;
    settings: ArchiveHouseholdSettings;
    accountSettings: ArchiveAccountSettings;
    parties: Party[];
    accounts: ArchiveBankAccount[];
    jars: Jar[];
    /** Name stubs for relinking — holdings themselves live in the Growth portal. */
    assets: Pick<Asset, 'id' | 'name'>[];
    income: IncomeSource[];
    fixedCosts: FixedCost[];
    debts: Debt[];
    goals: Goal[];
    rules: Rule[];
    transactions: Transaction[];
};

export type ExportSheet = {
    name: string;
    rows: Record<string, unknown>[];
};

async function listAllTransactions(
    householdId: string,
    period?: string | null
): Promise<Transaction[]> {
    const items: Transaction[] = [];
    let cursor: string | null | undefined;
    for (let page = 0; page < MAX_TX_PAGES; page++) {
        const result = await api.money.transactions.list({
            householdId,
            limit: PAGE_LIMIT,
            ...(period ? { period } : {}),
            ...(cursor ? { cursor } : {}),
        });
        items.push(...result.items);
        if (!result.nextCursor) break;
        cursor = result.nextCursor;
    }
    return items;
}

export async function fetchHouseholdExportBundle(
    householdId: string,
    access: HouseholdExportAccess
): Promise<HouseholdExportBundle> {
    const [
        householdSettings,
        accountSettings,
        jars,
        income,
        parties,
        accounts,
        banks,
        fixedCosts,
        debts,
        goals,
        rules,
        transactions,
        assets,
    ] = await Promise.all([
        api.household.settings({ householdId }),
        api.account.settings(),
        api.money.jars.list({ householdId }),
        api.money.income.list({ householdId }),
        api.money.parties.list({ householdId }),
        api.money.accounts.list({ householdId }),
        api.money.catalogs.banks.list({ householdId }),
        api.money.fixedCosts.list({ householdId }),
        access.includeDebts ? api.money.debts.list({ householdId }) : Promise.resolve([] as Debt[]),
        access.includeGoals ? api.money.goals.list({ householdId }) : Promise.resolve([] as Goal[]),
        api.money.rules.list({ householdId }),
        listAllTransactions(householdId),
        access.includeAssets
            ? api.growth.assets.list({ householdId })
            : Promise.resolve([] as Asset[]),
    ]);
    return {
        exportedAt: new Date().toISOString(),
        householdId,
        access,
        settings: portableHouseholdSettings(householdSettings),
        accountSettings: portableAccountSettings(accountSettings),
        parties,
        accounts: portableBankAccounts(accounts, banks),
        jars,
        assets: assets.map(asset => ({ id: asset.id, name: asset.name })),
        income,
        fixedCosts,
        debts,
        goals,
        rules,
        transactions,
    };
}

function portableHouseholdSettings(settings: HouseholdSettings): ArchiveHouseholdSettings {
    return {
        why: settings.why ?? null,
        kind: settings.kind,
        currency: settings.currency,
        money: settings.money,
        weekCheck: settings.weekCheck,
        features: settings.features,
        answers: settings.answers,
        audienceKeys: settings.audienceKeys,
    };
}

function portableAccountSettings(settings: AccountSettings): ArchiveAccountSettings {
    return {
        locale: settings.locale,
        theme: settings.theme,
        spendingStyle: settings.spendingStyle,
    };
}

function portableBankAccounts(
    accounts: Account[],
    banks: Array<{ id: string; key: string }>
): ArchiveBankAccount[] {
    const bankKeyById = new Map(banks.map(bank => [bank.id, bank.key]));
    const nameById = new Map(accounts.map(account => [account.id, account.name]));
    const rows: ArchiveBankAccount[] = [];
    for (const account of accounts) {
        const bankKey = bankKeyById.get(account.bankId);
        if (!bankKey) continue;
        rows.push({
            name: account.name,
            kind: account.kind,
            bankKey,
            iban: account.iban,
            balance: account.balance,
            isPrimary: account.isPrimary,
            wasConnected: account.connectionId !== null,
            settlementAccountName: account.settlementAccountId
                ? (nameById.get(account.settlementAccountId) ?? null)
                : null,
        });
    }
    return rows;
}

export async function fetchTransactionsForExport(
    householdId: string,
    period?: string | null
): Promise<Transaction[]> {
    return listAllTransactions(householdId, period);
}

function jarNameMap(jars: Jar[]): Map<string, string> {
    return new Map(jars.map(jar => [jar.id, jar.name]));
}

function jarKeyMap(jars: Jar[]): Map<string, string> {
    return new Map(jars.map(jar => [jar.id, jar.key]));
}

/** Portable CSV for Sheets / other apps — major units, common headers + jarKey for restore. */
export function portableTransactionRows(
    transactions: Transaction[],
    jars: Jar[]
): Record<string, unknown>[] {
    const names = jarNameMap(jars);
    const keys = jarKeyMap(jars);
    return transactions.map(transaction => ({
        date: transaction.bookedOn,
        amount: fromMinorUnits(transaction.amount).toFixed(2),
        description: transaction.description,
        payee: transaction.counterparty ?? '',
        jar: transaction.jarId ? (names.get(transaction.jarId) ?? '') : '',
        jarKey: transaction.jarId ? (keys.get(transaction.jarId) ?? '') : '',
        note: transaction.note ?? '',
    }));
}

/** Rich rows for Excel / JSON-adjacent sheets (minor units + jar key for restore). */
export function transactionExportRows(
    transactions: Transaction[],
    jars: Jar[]
): Record<string, unknown>[] {
    const names = jarNameMap(jars);
    const keys = jarKeyMap(jars);
    return transactions.map(transaction => ({
        id: transaction.id,
        bookedOn: transaction.bookedOn,
        description: transaction.description,
        counterparty: transaction.counterparty ?? '',
        amountCents: transaction.amount,
        status: transaction.status,
        jar: transaction.jarId ? (names.get(transaction.jarId) ?? transaction.jarId) : '',
        jarKey: transaction.jarId ? (keys.get(transaction.jarId) ?? '') : '',
        categoryId: transaction.categoryId ?? '',
        debtId: transaction.debtId ?? '',
        fixedCostId: transaction.fixedCostId ?? '',
        assetId: transaction.assetId ?? '',
        source: transaction.source,
        note: transaction.note ?? '',
    }));
}

export function buildExportSheets(bundle: HouseholdExportBundle): ExportSheet[] {
    const names = jarNameMap(bundle.jars);
    const keys = jarKeyMap(bundle.jars);
    const assetNames = new Map(bundle.assets.map(asset => [asset.id, asset.name]));
    const assetName = (assetId: string | null | undefined) =>
        assetId ? (assetNames.get(assetId) ?? '') : '';
    const sheets: ExportSheet[] = [
        {
            name: 'Settings',
            rows: [
                {
                    currency: bundle.settings.currency ?? '',
                    kind: bundle.settings.kind ?? '',
                    why: bundle.settings.why ?? '',
                    periodStartDay: bundle.settings.money?.periodStartDay ?? '',
                    incomeStability: bundle.settings.money?.incomeStability ?? '',
                    payoffStrategy: bundle.settings.money?.payoffStrategy ?? '',
                    reminderDay: bundle.settings.weekCheck?.reminderDay ?? '',
                    reminderAt: bundle.settings.weekCheck?.reminderAt ?? '',
                    isBankSyncEnabled: bundle.settings.features?.isBankSyncEnabled ?? '',
                    isCoachEnabled: bundle.settings.features?.isCoachEnabled ?? '',
                    audienceKeys: (bundle.settings.audienceKeys ?? []).join('|'),
                    answersJson: JSON.stringify(bundle.settings.answers ?? {}),
                },
            ],
        },
        {
            name: 'Account settings',
            rows: [
                {
                    locale: bundle.accountSettings.locale ?? '',
                    theme: bundle.accountSettings.theme ?? '',
                    spendingStyle: bundle.accountSettings.spendingStyle ?? '',
                },
            ],
        },
        {
            name: 'Jars',
            rows: bundle.jars.map(jar => ({
                id: jar.id,
                key: jar.key,
                name: jar.name,
                percentage: jar.percentage,
                sortOrder: jar.sortOrder,
            })),
        },
        {
            name: 'Income',
            rows: bundle.income.map(source => {
                const party = source.partyId
                    ? bundle.parties.find(row => row.id === source.partyId)
                    : undefined;
                return {
                    id: source.id,
                    name: source.name,
                    presetKey: source.presetKey ?? '',
                    counterparty: source.counterparty ?? '',
                    merchantKey: source.merchantKey ?? '',
                    partyName: party?.name ?? '',
                    assetName: assetName(source.assetId),
                    kind: source.kind,
                    amountCents: source.amount,
                    cadence: source.cadence,
                    expectedDay: source.expectedDay ?? '',
                    isActive: source.isActive,
                };
            }),
        },
        {
            name: 'Parties',
            rows: bundle.parties.map(party => ({
                id: party.id,
                name: party.name,
                note: party.note ?? '',
                aliases: party.aliases.join('|'),
                merchantKey: party.merchantKey ?? '',
                color: party.color ?? '',
                icon: party.icon ?? '',
                logoDomain: party.logoDomain ?? '',
                website: party.website ?? '',
            })),
        },
        {
            name: 'Accounts',
            rows: bundle.accounts.map(account => ({
                name: account.name,
                kind: account.kind,
                bankKey: account.bankKey,
                iban: account.iban ?? '',
                balanceCents: account.balance ?? 0,
                isPrimary: account.isPrimary ?? false,
                wasConnected: account.wasConnected ?? false,
                settlementAccountName: account.settlementAccountName ?? '',
            })),
        },
        {
            name: 'Fixed costs',
            rows: bundle.fixedCosts.map(cost => ({
                id: cost.id,
                name: cost.name,
                presetKey: cost.presetKey ?? '',
                amountCents: cost.amount,
                cadence: cost.cadence,
                direction: cost.direction,
                jar: names.get(cost.jarId) ?? cost.jarId,
                jarKey: keys.get(cost.jarId) ?? '',
                debtId: cost.debtId ?? '',
                assetName: assetName(cost.assetId),
                isActive: cost.isActive,
                counterparty: cost.counterparty ?? '',
            })),
        },
        {
            name: 'Transactions',
            rows: portableTransactionRows(bundle.transactions, bundle.jars),
        },
    ];
    if (bundle.access.includeDebts) {
        sheets.push({
            name: 'Debts',
            rows: bundle.debts.map(debt => ({
                id: debt.id,
                name: debt.name,
                presetKey: debt.presetKey ?? '',
                kind: debt.kind,
                balanceCents: debt.balance,
                interestRate: debt.interestRate,
                minimumPaymentCents: debt.minimumPayment,
                paymentCadence: debt.paymentCadence,
                closedOn: debt.closedOn ?? '',
            })),
        });
    }
    if (bundle.access.includeGoals) {
        sheets.push({
            name: 'Goals',
            rows: bundle.goals.map(goal => ({
                id: goal.id,
                name: goal.name,
                kind: goal.kind,
                targetCents: goal.target,
                savedCents: goal.saved,
                jar: goal.jarId ? (names.get(goal.jarId) ?? goal.jarId) : '',
                jarKey: goal.jarId ? (keys.get(goal.jarId) ?? '') : '',
                status: goal.status,
                targetOn: goal.targetOn ?? '',
            })),
        });
    }
    sheets.push({
        name: 'Rules',
        rows: bundle.rules.map(rule => ({
            id: rule.id,
            field: rule.field,
            matcher: rule.matcher,
            matchValue: rule.matchValue,
            jar: names.get(rule.jarId) ?? rule.jarId,
            jarKey: keys.get(rule.jarId) ?? '',
            categoryId: rule.categoryId ?? '',
            priority: rule.priority,
            isActive: rule.isActive,
            hitCount: rule.hitCount,
        })),
    });
    return sheets;
}

function csvFileName(sheetName: string): string {
    const slug = sheetName
        .toLowerCase()
        .replaceAll(/[^a-z0-9]+/g, '-')
        .replaceAll(/^-|-$/g, '');
    return `${slug || 'sheet'}.csv`;
}

export function downloadHouseholdJson(bundle: HouseholdExportBundle, stamp: string) {
    const { access, debts, goals, assets, ...rest } = bundle;
    const payload = {
        ...rest,
        ...(access.includeDebts ? { debts } : {}),
        ...(access.includeGoals ? { goals } : {}),
        ...(access.includeAssets ? { assets } : {}),
    };
    downloadTextFile(
        `rumtelo-export-${stamp}.json`,
        JSON.stringify(payload, null, 2),
        'application/json'
    );
}

/** Single portable transactions CSV (Sheets / banks / other apps). */
export function downloadHouseholdCsv(transactions: Transaction[], jars: Jar[], stamp: string) {
    downloadTextFile(
        `rumtelo-transactions-${stamp}.csv`,
        toCsv(portableTransactionRows(transactions, jars), [
            'date',
            'amount',
            'description',
            'payee',
            'jar',
            'jarKey',
            'note',
        ]),
        'text/csv;charset=utf-8'
    );
}

/** One real CSV per subject in a zip — not SpreadsheetML / fake .xls. */
export function downloadHouseholdCsvZip(bundle: HouseholdExportBundle, stamp: string) {
    const entries = buildExportSheets(bundle).map(sheet => ({
        name: csvFileName(sheet.name),
        content: toCsv(sheet.rows),
    }));
    downloadZip(`rumtelo-export-${stamp}.zip`, entries);
}
