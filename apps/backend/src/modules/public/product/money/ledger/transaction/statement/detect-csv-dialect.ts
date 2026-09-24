/**
 * Sniff which documented bank CSV dialect a file looks like.
 * Used to block importing a statement onto the wrong account seat.
 *
 * Wire format is an open string (`nl.ing`, …) so other markets can add
 * fingerprints without changing the oRPC contract enum surface.
 * Signatures: docs/engineering/banking.md
 */

/** Namespaced dialect ids — `country.bank` (or family). */
export type CsvDialect = 'nl.ing' | 'nl.rabobank' | 'nl.revolut' | 'nl.bunq' | 'nl.knab' | 'nl.asn';

/** Catalog `Bank.key` → dialects that belong on that seat. */
const BANK_KEY_DIALECTS: Readonly<Record<string, readonly CsvDialect[]>> = {
    ING: ['nl.ing'],
    RABOBANK: ['nl.rabobank'],
    REVOLUT: ['nl.revolut'],
    BUNQ: ['nl.bunq'],
    KNAB: ['nl.knab'],
    ASN_BANK: ['nl.asn'],
    SNS: ['nl.asn'],
    REGIOBANK: ['nl.asn'],
};

export function dialectsForBankKey(bankKey: string): readonly CsvDialect[] | null {
    return BANK_KEY_DIALECTS[bankKey] ?? null;
}

/**
 * True when the file sniffed as a known bank CSV that does not belong on
 * this account seat. Any detected dialect is gated — including onto banks
 * with no CSV dialect of their own (ABN AMRO, N26, Triodos, …): a Revolut
 * CSV on an ABN seat is still wrong.
 *
 * Undetected / generic CSV (`dialect` null) and CAMT/MT940 never gate here.
 */
export function csvDialectMismatchesBank(
    dialect: string | null,
    bankKey: string | null | undefined
): boolean {
    if (!dialect || !bankKey) return false;
    const expected = dialectsForBankKey(bankKey);
    if (!expected) return true;
    return !(expected as readonly string[]).includes(dialect);
}

/** Filename hint when headers are ambiguous (e.g. “Revolut Account Statement…). */
export function dialectFromFileName(fileName: string | null | undefined): CsvDialect | null {
    if (!fileName) return null;
    const name = fileName.toLowerCase();
    if (/\brevolut\b/.test(name)) return 'nl.revolut';
    if (/\bing\b/.test(name)) return 'nl.ing';
    if (/\brabo(bank)?\b/.test(name)) return 'nl.rabobank';
    if (/\bbunq\b/.test(name)) return 'nl.bunq';
    if (/\bknab\b/.test(name)) return 'nl.knab';
    if (/\basn\b|\bsns\b|\bregiobank\b/.test(name)) return 'nl.asn';
    return null;
}

/** Prefer header fingerprint; fall back to filename. */
export function resolveCsvDialect(content: string, fileName?: string | null): CsvDialect | null {
    return detectCsvDialect(content) ?? dialectFromFileName(fileName);
}

/** First non-sep header-ish line, lowercased. */
function headerLine(content: string): string {
    const stripped = content.replace(/^\uFEFF/, '');
    for (const line of stripped.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || /^sep=/i.test(trimmed)) continue;
        return trimmed.toLowerCase();
    }
    return '';
}

/**
 * Distinctive header fingerprints from documented exports.
 * Order matters: more specific signatures first.
 */
export function detectCsvDialect(content: string): CsvDialect | null {
    const header = headerLine(content);
    if (!header) return null;

    if (header.includes('af bij') && header.includes('bedrag (eur)')) return 'nl.ing';
    if (header.includes('naam tegenpartij') && header.includes('omschrijving-1'))
        return 'nl.rabobank';
    // Revolut personal (EN) — and DE/NL variants that keep Type/Product/Fee/Balance.
    if (
        (header.includes('completed date') && header.includes('started date')) ||
        (header.includes('type') &&
            header.includes('product') &&
            header.includes('fee') &&
            header.includes('balance') &&
            (header.includes('amount') || header.includes('bedrag') || header.includes('betrag')))
    ) {
        return 'nl.revolut';
    }
    if (header.includes('creditdebet') && header.includes('tegenrekeninghouder')) return 'nl.knab';
    if (
        header.includes('je rekening') ||
        header.includes('van / naar') ||
        header.includes('bedrag bij/af')
    ) {
        return 'nl.asn';
    }
    // bunq app: Date,Amount,Account,Counterparty,Name,Description
    if (
        header.includes('counterparty') &&
        header.includes('name') &&
        header.includes('description') &&
        (header.includes('amount') || header.includes('date'))
    ) {
        return 'nl.bunq';
    }
    // bunq desktop NL: Datum;Bedrag;Rekening;Tegenrekening;Naam;Omschrijving
    if (
        header.includes('tegenrekening') &&
        header.includes('naam') &&
        header.includes('omschrijving') &&
        header.includes('bedrag') &&
        !header.includes('af bij')
    ) {
        return 'nl.bunq';
    }

    return null;
}
