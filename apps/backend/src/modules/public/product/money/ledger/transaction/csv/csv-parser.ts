/**
 * Bank statement CSV parsing, kept separate from TransactionService because the
 * per-bank column mapping will keep growing (ING, Rabobank, ABN AMRO and bunq all
 * export different headers) and none of it is transaction business logic.
 */

import type { ParsedRow } from '../statement/parsed-row';

export type { ParsedRow } from '../statement/parsed-row';

/** Header aliases across the major Dutch exports. */
const COLUMNS = {
    date: ['date', 'datum', 'transactiedatum', 'boekingsdatum'],
    amount: ['amount', 'bedrag', 'bedrag (eur)', 'transactiebedrag'],
    description: ['description', 'omschrijving', 'mededelingen', 'naam / omschrijving'],
    counterparty: ['counterparty', 'tegenrekening', 'naam tegenpartij', 'tegenpartij'],
} as const;

export function parseStatementCsv(content: string): ParsedRow[] {
    const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) return [];

    const delimiter = sniffDelimiter(lines[0]!);
    const header = splitRow(lines[0]!, delimiter).map(headerCell => headerCell.toLowerCase());
    const col = (aliases: readonly string[]) =>
        header.findIndex(headerCol => aliases.some(alias => headerCol.includes(alias)));

    const iDate = col(COLUMNS.date);
    const iAmount = col(COLUMNS.amount);
    const iDesc = col(COLUMNS.description);
    const iParty = col(COLUMNS.counterparty);

    // Without a date and an amount there is nothing to import; fail loudly upstream.
    if (iDate < 0 || iAmount < 0) return [];

    return lines.slice(1).flatMap(line => {
        const cells = splitRow(line, delimiter);
        const bookedOn = normaliseDate(cells[iDate] ?? '');
        const amount = parseAmount(cells[iAmount] ?? '');
        if (!bookedOn || amount === null) return [];
        return [
            {
                bookedOn,
                amount,
                description: (iDesc >= 0 ? cells[iDesc] : '') || 'Geïmporteerd',
                counterparty: iParty >= 0 ? cells[iParty] || null : null,
            },
        ];
    });
}

function sniffDelimiter(headerLine: string): string {
    const semis = (headerLine.match(/;/g) ?? []).length;
    const commas = (headerLine.match(/,/g) ?? []).length;
    return semis > commas ? ';' : ',';
}

function splitRow(line: string, delimiter: string): string[] {
    return line.split(delimiter).map(cell => cell.trim().replace(/^"|"$/g, ''));
}

/**
 * Dutch exports use comma as the decimal separator and dot as the thousands
 * separator — the opposite of the JS default, so parsing naively silently
 * turns €1.234,56 into 1.234.
 */
function parseAmount(raw: string): number | null {
    const cleaned = raw.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
    const value = Number(cleaned);
    return Number.isFinite(value) ? Math.round(value * 100) : null;
}

/** Accepts YYYY-MM-DD, YYYYMMDD and DD-MM-YYYY, covering the major NL exports. */
function normaliseDate(raw: string): string | null {
    const trimmed = raw.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    if (/^\d{8}$/.test(trimmed))
        return `${trimmed.slice(0, 4)}-${trimmed.slice(4, 6)}-${trimmed.slice(6, 8)}`;
    const match = trimmed.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
    return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
}
