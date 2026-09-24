/**
 * Bank statement CSV parsing.
 *
 * Header aliases are limited to documented NL-bank exports — see
 * docs/engineering/banking.md → "NL bank download formats (sourced)".
 * Do not add speculative synonyms; bring a real sample + source instead.
 */

import type { ParsedRow } from '../statement/parsed-row';

export type { ParsedRow } from '../statement/parsed-row';

/**
 * Documented headers only (lowercased). Longer / more specific aliases win.
 * Payee → counterparty; memo → description (inbox title = counterparty || description).
 */
const COLUMNS = {
    /** ING Datum; Rabo Datum; bunq Date/Datum; Revolut Completed Date; ASN Datum; Knab Transactiedatum/Boekdatum */
    date: [
        'completed date',
        'date completed',
        'date completed (utc)',
        'transactiedatum',
        'boekingsdatum',
        'boekdatum',
        'rentedatum',
        'started date',
        'datum voltooid',
        'datum gestart',
        'verwerkingsdatum',
        'datum',
        'date',
    ],
    /** ING Bedrag (EUR); Rabo/Knab/ASN/bunq/Revolut Bedrag|Amount|Bedrag bij/af */
    amount: ['bedrag (eur)', 'bedrag bij/af', 'amount (eur)', 'bedrag', 'amount'],
    /** ING Af Bij; Knab CreditDebet (C/D) */
    debitCredit: ['af bij', 'creditdebet'],
    /** Memo / remittance — not the payee name */
    description: [
        'omschrijving-1',
        'mededelingen',
        'beschrijving',
        'beschreibung',
        'description',
        'omschrijving',
        'reference',
    ],
    /** Revolut Type — last-resort title when description is blank. */
    type: ['type', 'soort'],
    /** Payee / counterparty name (preferred inbox title) */
    counterparty: [
        'naam / omschrijving',
        'naam/omschrijving',
        'naam tegenpartij',
        'tegenrekeninghouder',
        'naam van de tegenpartij',
        'payer',
        'name',
        'naam',
    ],
} as const;

export function parseStatementCsv(content: string): ParsedRow[] {
    const stripped = content.replace(/^\uFEFF/, '');
    const lines = stripped.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) return [];

    const headerIndex = findHeaderIndex(lines);
    if (headerIndex < 0) return [];

    const headerLine = lines[headerIndex]!;
    const delimiter = sniffDelimiter(headerLine);
    const header = splitRow(headerLine, delimiter).map(cell =>
        cell.toLowerCase().replace(/^\uFEFF/, '')
    );
    const col = (aliases: readonly string[]) => bestColumnIndex(header, aliases);

    const iDate = col(COLUMNS.date);
    const iAmount = col(COLUMNS.amount);
    const iDebitCredit = col(COLUMNS.debitCredit);
    const iDesc = col(COLUMNS.description);
    const iType = col(COLUMNS.type);
    const iParty = col(COLUMNS.counterparty);

    // Without a date and an amount there is nothing to import.
    if (iDate < 0 || iAmount < 0) return [];

    return lines.slice(headerIndex + 1).flatMap(line => {
        const cells = splitRow(line, delimiter);
        const bookedOn = normaliseDate(cells[iDate] ?? '');
        let amount = parseAmount(cells[iAmount] ?? '');
        if (!bookedOn || amount === null) return [];

        if (iDebitCredit >= 0) {
            amount = applyDebitCredit(amount, cells[iDebitCredit] ?? '');
        }

        const payee = (iParty >= 0 ? cells[iParty]?.trim() : '') || '';
        const memo = (iDesc >= 0 ? cells[iDesc]?.trim() : '') || '';
        const typeLabel = (iType >= 0 ? cells[iType]?.trim() : '') || '';
        const description = memo || payee || typeLabel || 'Transaction';

        return [
            {
                bookedOn,
                amount,
                description,
                counterparty: payee || null,
            },
        ];
    });
}

/**
 * Exact header match first, then longest substring (≥4 chars)
 * so "Completed Date" / "Naam / Omschrijving" beat bare "date" / "naam".
 */
function bestColumnIndex(header: readonly string[], aliases: readonly string[]): number {
    for (const alias of aliases) {
        const exact = header.findIndex(cell => cell === alias);
        if (exact >= 0) return exact;
    }
    let bestIndex = -1;
    let bestLength = -1;
    for (let index = 0; index < header.length; index++) {
        const cell = header[index]!;
        for (const alias of aliases) {
            if (alias.length < 4) continue;
            if (cell.includes(alias) && alias.length > bestLength) {
                bestIndex = index;
                bestLength = alias.length;
            }
        }
    }
    return bestIndex;
}

/** Excel often prefixes `sep=;` / metadata before the real header row. */
function findHeaderIndex(lines: readonly string[]): number {
    const limit = Math.min(lines.length - 1, 12);
    for (let index = 0; index <= limit; index++) {
        const line = lines[index]!;
        if (/^sep=/i.test(line.trim())) continue;
        const delimiter = sniffDelimiter(line);
        const header = splitRow(line, delimiter).map(cell => cell.toLowerCase());
        const hasDate = header.some(cell => COLUMNS.date.some(alias => cell.includes(alias)));
        const hasAmount = header.some(cell => COLUMNS.amount.some(alias => cell.includes(alias)));
        if (hasDate && hasAmount) return index;
    }
    return -1;
}

function sniffDelimiter(headerLine: string): string {
    const semis = (headerLine.match(/;/g) ?? []).length;
    const commas = (headerLine.match(/,/g) ?? []).length;
    const tabs = (headerLine.match(/\t/g) ?? []).length;
    if (tabs > semis && tabs > commas) return '\t';
    return semis > commas ? ';' : ',';
}

function splitRow(line: string, delimiter: string): string[] {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let index = 0; index < line.length; index++) {
        const char = line[index]!;
        if (char === '"') {
            if (inQuotes && line[index + 1] === '"') {
                current += '"';
                index++;
                continue;
            }
            inQuotes = !inQuotes;
            continue;
        }
        if (char === delimiter && !inQuotes) {
            cells.push(current.trim());
            current = '';
            continue;
        }
        current += char;
    }
    cells.push(current.trim());
    return cells;
}

/**
 * NL banks: `1.234,56`. Revolut / EN: `-113.88` or `1,234.56`.
 * Last separator wins as the decimal mark.
 */
function parseAmount(raw: string): number | null {
    const cleaned = raw.replace(/\s/g, '').replace(/€|EUR/gi, '');
    if (!cleaned || cleaned === '-') return null;

    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    let normalised: string;
    if (lastComma > lastDot) {
        normalised = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (lastDot > lastComma) {
        normalised = cleaned.replace(/,/g, '');
    } else if (lastComma >= 0) {
        normalised = cleaned.replace(',', '.');
    } else {
        normalised = cleaned;
    }

    const value = Number(normalised);
    return Number.isFinite(value) ? Math.round(value * 100) : null;
}

/** ING Af/Bij; Knab CreditDebet C/D. */
function applyDebitCredit(amountCents: number, raw: string): number {
    const token = raw.trim().toLowerCase();
    if (!token) return amountCents;
    const absolute = Math.abs(amountCents);
    if (token === 'af' || token === 'd' || token.startsWith('debit')) return -absolute;
    if (token === 'bij' || token === 'c' || token.startsWith('credit')) return absolute;
    return amountCents;
}

/** YYYY-MM-DD, datetime stamps, YYYYMMDD, DD-MM-YYYY. */
function normaliseDate(raw: string): string | null {
    const trimmed = raw.trim();
    const isoPrefix = trimmed.match(/^(\d{4}-\d{2}-\d{2})(?:[ T].*)?$/);
    if (isoPrefix) return isoPrefix[1]!;
    if (/^\d{8}$/.test(trimmed))
        return `${trimmed.slice(0, 4)}-${trimmed.slice(4, 6)}-${trimmed.slice(6, 8)}`;
    const match = trimmed.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
    return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
}
