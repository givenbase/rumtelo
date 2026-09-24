import type { StatementFormat } from './parsed-row';

/**
 * Sniff statement format from raw content.
 * CAMT.053 first (XML), then MT940 (SWIFT tags), else CSV.
 */
export function detectStatementFormat(content: string): StatementFormat {
    const trimmed = content.trim();
    if (!trimmed) return 'csv';

    if (
        /BkToCstmrStmt/i.test(trimmed) ||
        /camt\.053/i.test(trimmed) ||
        (/^\s*<\?xml/i.test(trimmed) && /Ntry\b/i.test(trimmed) && /Amt\b/i.test(trimmed))
    ) {
        return 'camt053';
    }

    // SWIFT MT940: reference + account and at least one statement line.
    if (
        /:20:/.test(trimmed) &&
        (/:25:/.test(trimmed) || /:28C?:/.test(trimmed)) &&
        /:61:/.test(trimmed)
    ) {
        return 'mt940';
    }
    // Loose: several :61: lines even without a full header (partial exports).
    if ((trimmed.match(/:61:/g) ?? []).length >= 1 && /:86:/.test(trimmed)) {
        return 'mt940';
    }

    return 'csv';
}
