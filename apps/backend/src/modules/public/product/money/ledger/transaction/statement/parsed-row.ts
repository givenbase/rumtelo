/** Normalised bank-statement row — shared by CSV, MT940, and CAMT.053 parsers. */
export interface ParsedRow {
    bookedOn: string;
    /** Signed minor units (eurocents). Debits negative, credits positive. */
    amount: number;
    description: string;
    counterparty: string | null;
}

export type StatementFormat = 'csv' | 'mt940' | 'camt053';
