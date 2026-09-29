/**
 * Turn a Rumtelo CSV export zip (or loose sheet map) into ArchiveRestorePayload
 * for money.archive.restore — same contract as JSON import.
 */

import {
    ArchiveRestorePayload,
    Cadence,
    DebtKind,
    FlowDirection,
    GoalKind,
    GoalStatus,
    IncomeKind,
    JarKey,
    RuleField,
    RuleMatcher,
    type ArchiveRestorePayload as Payload,
} from '@rumtelo/contracts';
import { toMinorUnits } from '@rumtelo/utils';

type Row = Record<string, string>;

function stripBom(text: string): string {
    return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function parseCsv(text: string): Row[] {
    const raw = stripBom(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    if (!raw.trim()) return [];
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = '';
    let inQuotes = false;
    for (let i = 0; i < raw.length; i++) {
        const ch = raw[i]!;
        if (inQuotes) {
            if (ch === '"') {
                if (raw[i + 1] === '"') {
                    cell += '"';
                    i += 1;
                } else {
                    inQuotes = false;
                }
            } else {
                cell += ch;
            }
            continue;
        }
        if (ch === '"') {
            inQuotes = true;
            continue;
        }
        if (ch === ',') {
            row.push(cell);
            cell = '';
            continue;
        }
        if (ch === '\n') {
            row.push(cell);
            rows.push(row);
            row = [];
            cell = '';
            continue;
        }
        cell += ch;
    }
    if (cell.length > 0 || row.length > 0) {
        row.push(cell);
        rows.push(row);
    }
    const headers = (rows[0] ?? []).map(header => header.trim());
    if (headers.length === 0) return [];
    return rows
        .slice(1)
        .filter(cells => cells.some(value => value.trim() !== ''))
        .map(cells => {
            const out: Row = {};
            for (let i = 0; i < headers.length; i++) {
                out[headers[i]!] = (cells[i] ?? '').trim();
            }
            return out;
        });
}

function u16(view: DataView, offset: number): number {
    return view.getUint16(offset, true);
}

function u32(view: DataView, offset: number): number {
    return view.getUint32(offset, true);
}

/** Read store-only (method 0) ZIP entries as UTF-8 text. */
export function readZipTextEntries(buffer: ArrayBuffer): Map<string, string> {
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);
    const files = new Map<string, string>();
    let offset = 0;
    const decoder = new TextDecoder();

    while (offset + 4 <= bytes.length) {
        const sig = u32(view, offset);
        if (sig !== 0x04034b50) break;
        const method = u16(view, offset + 8);
        const compSize = u32(view, offset + 18);
        const nameLen = u16(view, offset + 26);
        const extraLen = u16(view, offset + 28);
        const nameStart = offset + 30;
        const name = decoder.decode(bytes.subarray(nameStart, nameStart + nameLen));
        const dataStart = nameStart + nameLen + extraLen;
        const dataEnd = dataStart + compSize;
        if (dataEnd > bytes.length) {
            throw new Error('zip_truncated');
        }
        if (method !== 0) {
            throw new Error('zip_compressed');
        }
        const base = name.split('/').pop() ?? name;
        files.set(base.toLowerCase(), decoder.decode(bytes.subarray(dataStart, dataEnd)));
        offset = dataEnd;
    }
    if (files.size === 0) throw new Error('zip_empty');
    return files;
}

function sheet(files: Map<string, string>, ...names: string[]): Row[] {
    for (const name of names) {
        const text = files.get(name.toLowerCase());
        if (text !== undefined) return parseCsv(text);
    }
    return [];
}

function asBool(value: string | undefined, fallback = true): boolean {
    if (value === undefined || value === '') return fallback;
    const lower = value.toLowerCase();
    if (lower === 'true' || lower === '1' || lower === 'yes') return true;
    if (lower === 'false' || lower === '0' || lower === 'no') return false;
    return fallback;
}

function asInt(value: string | undefined): number | null {
    if (value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

function asMoneyCents(row: Row, centsKey: string, majorKey?: string): number | null {
    const cents = asInt(row[centsKey]);
    if (cents !== null) return cents;
    if (majorKey && row[majorKey] !== undefined && row[majorKey] !== '') {
        const major = Number(row[majorKey]);
        if (!Number.isFinite(major)) return null;
        return toMinorUnits(major);
    }
    return null;
}

function enumOr<T extends string>(
    value: string | undefined,
    allowed: readonly T[],
    fallback: T
): T {
    if (value && (allowed as readonly string[]).includes(value)) return value as T;
    return fallback;
}

function buildJarMaps(jars: Array<{ id?: string; key: JarKey; name?: string }>) {
    const byName = new Map<string, string>();
    const byKey = new Map<string, string>();
    for (const jar of jars) {
        if (!jar.id) continue;
        byKey.set(jar.key, jar.id);
        if (jar.name) byName.set(jar.name.toLowerCase(), jar.id);
    }
    return { byName, byKey };
}

function resolveJarId(
    maps: ReturnType<typeof buildJarMaps>,
    jarKey: string | undefined,
    jarName: string | undefined
): string | null {
    if (jarKey && maps.byKey.has(jarKey)) return maps.byKey.get(jarKey)!;
    if (jarName) {
        const byName = maps.byName.get(jarName.toLowerCase());
        if (byName) return byName;
        if (maps.byKey.has(jarName)) return maps.byKey.get(jarName)!;
    }
    return null;
}

/** Map Rumtelo CSV zip sheets → archive restore payload. */
export function archivePayloadFromCsvSheets(files: Map<string, string>): Payload {
    const jarRows = sheet(files, 'jars.csv');
    const jars = jarRows
        .map(row => {
            const key = row.key as JarKey | undefined;
            if (!key || !(Object.values(JarKey) as string[]).includes(key)) return null;
            const percentage = Number(row.percentage);
            if (!Number.isFinite(percentage)) return null;
            return {
                id: row.id || undefined,
                key,
                name: row.name || undefined,
                percentage,
            };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null);

    const jarMaps = buildJarMaps(jars);

    const income = sheet(files, 'income.csv')
        .map(row => {
            const amount = asMoneyCents(row, 'amountCents', 'amount');
            if (!row.name || amount === null) return null;
            return {
                name: row.name,
                counterparty: row.counterparty || null,
                kind: enumOr(row.kind, Object.values(IncomeKind), IncomeKind.SALARY),
                amount,
                cadence: row.cadence
                    ? enumOr(row.cadence, Object.values(Cadence), Cadence.MONTHLY)
                    : undefined,
                expectedDay: asInt(row.expectedDay),
                isActive: asBool(row.isActive),
            };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null);

    const fixedCosts = sheet(files, 'fixed-costs.csv', 'fixed_costs.csv')
        .map(row => {
            const amount = asMoneyCents(row, 'amountCents', 'amount');
            const jarId = resolveJarId(jarMaps, row.jarKey, row.jar);
            if (!row.name || amount === null || !jarId) return null;
            return {
                id: row.id || undefined,
                jarId,
                name: row.name,
                amount,
                cadence: row.cadence
                    ? enumOr(row.cadence, Object.values(Cadence), Cadence.MONTHLY)
                    : undefined,
                direction: row.direction
                    ? enumOr(row.direction, Object.values(FlowDirection), FlowDirection.OUT)
                    : undefined,
                debtId: row.debtId || null,
                counterparty: row.counterparty || null,
                isActive: asBool(row.isActive),
            };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null);

    const debts = sheet(files, 'debts.csv')
        .map(row => {
            const balance = asMoneyCents(row, 'balanceCents', 'balance');
            if (!row.name || balance === null) return null;
            const interest = Number(row.interestRate ?? '0');
            return {
                id: row.id || undefined,
                name: row.name,
                kind: enumOr(row.kind, Object.values(DebtKind), DebtKind.OTHER),
                balance,
                interestRate: Number.isFinite(interest) ? interest : 0,
                minimumPayment:
                    asMoneyCents(row, 'minimumPaymentCents', 'minimumPayment') ?? undefined,
                paymentCadence: row.paymentCadence
                    ? enumOr(row.paymentCadence, Object.values(Cadence), Cadence.MONTHLY)
                    : undefined,
                closedOn: row.closedOn || null,
            };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null);

    const goals = sheet(files, 'goals.csv')
        .map(row => {
            const target = asMoneyCents(row, 'targetCents', 'target');
            if (!row.name || target === null) return null;
            return {
                name: row.name,
                kind: row.kind
                    ? enumOr(row.kind, Object.values(GoalKind), GoalKind.SAVE)
                    : undefined,
                jarId: resolveJarId(jarMaps, row.jarKey, row.jar),
                target,
                targetOn: row.targetOn || null,
                status: row.status
                    ? enumOr(row.status, Object.values(GoalStatus), GoalStatus.ACTIVE)
                    : undefined,
            };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null);

    const rules = sheet(files, 'rules.csv')
        .map(row => {
            const jarId = resolveJarId(jarMaps, row.jarKey, row.jar);
            if (!row.field || !row.matcher || !row.matchValue || !jarId) return null;
            if (!(Object.values(RuleField) as string[]).includes(row.field)) return null;
            if (!(Object.values(RuleMatcher) as string[]).includes(row.matcher)) return null;
            return {
                field: row.field as RuleField,
                matcher: row.matcher as RuleMatcher,
                matchValue: row.matchValue,
                jarId,
                categoryId: row.categoryId || null,
                priority: asInt(row.priority) ?? undefined,
                isActive: asBool(row.isActive),
            };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null);

    const transactions = sheet(files, 'transactions.csv')
        .map(row => {
            const bookedOn = row.date || row.bookedOn;
            const description = row.description;
            if (!bookedOn || !description) return null;
            let amount: number | null = null;
            if (row.amountCents !== undefined && row.amountCents !== '') {
                amount = asInt(row.amountCents);
            } else if (row.amount !== undefined && row.amount !== '') {
                const major = Number(row.amount);
                amount = Number.isFinite(major) ? toMinorUnits(major) : null;
            }
            if (amount === null) return null;
            return {
                bookedOn,
                amount,
                description,
                counterparty: row.payee || row.counterparty || null,
                jarId: resolveJarId(jarMaps, row.jarKey, row.jar),
                note: row.note || null,
            };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null);

    return ArchiveRestorePayload.parse({
        exportedAt: new Date().toISOString(),
        jars,
        income,
        fixedCosts,
        debts,
        goals,
        rules,
        transactions,
    });
}

export type ArchiveImportSource = 'json' | 'csv-zip' | 'csv';

export type ArchiveImportFound = {
    jars: number;
    income: number;
    fixedCosts: number;
    debts: number;
    goals: number;
    rules: number;
    transactions: number;
};

export type ArchiveImportParseResult = {
    payload: Payload;
    source: ArchiveImportSource;
    found: ArchiveImportFound;
    /** Sheet file names detected inside a zip (empty for JSON / single CSV). */
    sheets: string[];
};

export function summarizeArchivePayload(payload: Payload): ArchiveImportFound {
    return {
        jars: payload.jars.length,
        income: payload.income.length,
        fixedCosts: payload.fixedCosts.length,
        debts: payload.debts.length,
        goals: payload.goals.length,
        rules: payload.rules.length,
        transactions: payload.transactions.length,
    };
}

function hasHeaders(headers: Set<string>, ...needed: string[]): boolean {
    return needed.every(header => headers.has(header));
}

/** Guess Rumtelo sheet name from filename or CSV header row. */
export function detectCsvSheetName(fileName: string, csvText: string): string {
    const base = fileName.split('/').pop()?.toLowerCase() ?? '';
    const known = [
        'jars.csv',
        'income.csv',
        'fixed-costs.csv',
        'fixed_costs.csv',
        'transactions.csv',
        'debts.csv',
        'goals.csv',
        'rules.csv',
    ];
    if (known.includes(base)) return base === 'fixed_costs.csv' ? 'fixed-costs.csv' : base;

    const firstLine = stripBom(csvText).split(/\r?\n/)[0] ?? '';
    const headers = new Set(
        firstLine.split(',').map(header => header.trim().replaceAll(/^"|"$/g, '').toLowerCase())
    );

    if (hasHeaders(headers, 'key', 'percentage')) return 'jars.csv';
    if (hasHeaders(headers, 'field', 'matcher', 'matchvalue')) return 'rules.csv';
    if (
        hasHeaders(headers, 'balancecents') ||
        (hasHeaders(headers, 'interestrate') && hasHeaders(headers, 'name'))
    ) {
        return 'debts.csv';
    }
    if (hasHeaders(headers, 'targetcents') || hasHeaders(headers, 'savedcents')) {
        return 'goals.csv';
    }
    if (
        hasHeaders(headers, 'date', 'amount', 'description') ||
        hasHeaders(headers, 'bookedon', 'amount')
    ) {
        return 'transactions.csv';
    }
    if (hasHeaders(headers, 'direction') || hasHeaders(headers, 'amountcents', 'jar')) {
        return 'fixed-costs.csv';
    }
    if (hasHeaders(headers, 'kind') && (headers.has('amountcents') || headers.has('cadence'))) {
        return 'income.csv';
    }
    throw new Error('csv_sheet_unknown');
}

export async function archivePayloadFromFile(file: File): Promise<ArchiveImportParseResult> {
    const name = file.name.toLowerCase();

    if (name.endsWith('.zip') || file.type === 'application/zip') {
        const buffer = await file.arrayBuffer();
        const files = readZipTextEntries(buffer);
        const payload = archivePayloadFromCsvSheets(files);
        return {
            payload,
            source: 'csv-zip',
            found: summarizeArchivePayload(payload),
            sheets: [...files.keys()].sort(),
        };
    }

    if (name.endsWith('.csv') || file.type === 'text/csv') {
        const text = await file.text();
        const sheetName = detectCsvSheetName(file.name, text);
        const files = new Map<string, string>([[sheetName, text]]);
        const payload = archivePayloadFromCsvSheets(files);
        return {
            payload,
            source: 'csv',
            found: summarizeArchivePayload(payload),
            sheets: [sheetName],
        };
    }

    const text = await file.text();
    const payload = ArchiveRestorePayload.parse(JSON.parse(text));
    return {
        payload,
        source: 'json',
        found: summarizeArchivePayload(payload),
        sheets: [],
    };
}
