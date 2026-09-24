import { parseStatementCsv } from '../csv/csv-parser';
import { parseCamt053 } from './camt053-parser';
import { resolveCsvDialect } from './detect-csv-dialect';
import { detectStatementFormat } from './detect-format';
import { parseMt940 } from './mt940-parser';
import type { ParsedRow, StatementFormat } from './parsed-row';

export type { ParsedRow, StatementFormat } from './parsed-row';
export type { CsvDialect } from './detect-csv-dialect';
export {
    csvDialectMismatchesBank,
    detectCsvDialect,
    dialectFromFileName,
    dialectsForBankKey,
    resolveCsvDialect,
} from './detect-csv-dialect';
export { detectStatementFormat } from './detect-format';

/**
 * Parse a bank statement file (CAMT.053, MT940, or CSV).
 * Pass `format: 'auto'` (default) to sniff from content.
 */
export function parseStatement(
    content: string,
    format: StatementFormat | 'auto' = 'auto',
    fileName?: string | null
): {
    format: StatementFormat;
    rows: ParsedRow[];
    csvDialect: ReturnType<typeof resolveCsvDialect>;
} {
    const resolved = format === 'auto' ? detectStatementFormat(content) : format;
    const rows =
        resolved === 'camt053'
            ? parseCamt053(content)
            : resolved === 'mt940'
              ? parseMt940(content)
              : parseStatementCsv(content);
    const csvDialect = resolved === 'csv' ? resolveCsvDialect(content, fileName) : null;
    return { format: resolved, rows, csvDialect };
}
