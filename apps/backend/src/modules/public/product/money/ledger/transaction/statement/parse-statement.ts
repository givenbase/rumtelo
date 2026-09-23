import { parseStatementCsv } from '../csv/csv-parser';
import { parseCamt053 } from './camt053-parser';
import { detectStatementFormat } from './detect-format';
import { parseMt940 } from './mt940-parser';
import type { ParsedRow, StatementFormat } from './parsed-row';

export type { ParsedRow, StatementFormat } from './parsed-row';
export { detectStatementFormat } from './detect-format';

/**
 * Parse a bank statement file (CAMT.053, MT940, or CSV).
 * Pass `format: 'auto'` (default) to sniff from content.
 */
export function parseStatement(
    content: string,
    format: StatementFormat | 'auto' = 'auto'
): { format: StatementFormat; rows: ParsedRow[] } {
    const resolved = format === 'auto' ? detectStatementFormat(content) : format;
    const rows =
        resolved === 'camt053'
            ? parseCamt053(content)
            : resolved === 'mt940'
              ? parseMt940(content)
              : parseStatementCsv(content);
    return { format: resolved, rows };
}
