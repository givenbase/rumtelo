import type { ParsedRow } from './parsed-row';

/**
 * Parse ISO 20022 CAMT.053 (BkToCstmrStmt) XML into ledger rows.
 * Namespace-agnostic — works with camt.053.001.02 / .08 and bank wrappers.
 */
export function parseCamt053(content: string): ParsedRow[] {
    const entries = elementBlocks(content, 'Ntry');
    if (entries.length === 0) return [];

    return entries.flatMap(block => {
        const bookedRaw =
            firstText(block, 'Dt', nestedIn(block, 'BookgDt')) ??
            firstText(block, 'Dt', nestedIn(block, 'ValDt')) ??
            firstText(block, 'Dt');
        const bookedOn = normaliseIsoDate(bookedRaw ?? '');
        if (!bookedOn) return [];

        const cents = parseDecimalToCents(matchAmountElement(block) ?? '');
        if (cents === null) return [];

        const indicator = (firstText(block, 'CdtDbtInd') ?? '').toUpperCase();
        const signed = indicator === 'DBIT' ? -Math.abs(cents) : Math.abs(cents);

        const counterparty =
            firstText(block, 'Nm', nestedIn(block, 'Cdtr')) ??
            firstText(block, 'Nm', nestedIn(block, 'Dbtr')) ??
            firstText(block, 'Nm', nestedIn(block, 'RltdPties')) ??
            null;

        const remittance =
            firstText(block, 'Ustrd') ??
            firstText(block, 'AddtlNtryInf') ??
            firstText(block, 'AddtlTxInf') ??
            '';

        const description =
            remittance.trim() ||
            counterparty?.trim() ||
            firstText(block, 'NtryRef') ||
            'Geïmporteerd';

        return [
            {
                bookedOn,
                amount: signed,
                description: description.trim(),
                counterparty: counterparty?.trim() || null,
            },
        ];
    });
}

/** All element bodies for a local name, ignoring XML namespaces. */
function elementBlocks(xml: string, localName: string): string[] {
    const re = new RegExp(
        `<([^:\\s>]+?:)?${localName}\\b[^>]*>([\\s\\S]*?)<\\/([^:\\s>]+?:)?${localName}>`,
        'gi'
    );
    const out: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = re.exec(xml)) !== null) {
        out.push(match[2] ?? '');
    }
    return out;
}

function nestedIn(xml: string, localName: string): string | null {
    return elementBlocks(xml, localName)[0] ?? null;
}

function firstText(xml: string, localName: string, scope?: string | null): string | null {
    const source = scope ?? xml;
    const blocks = elementBlocks(source, localName);
    for (const body of blocks) {
        const text = stripTags(body).trim();
        if (text) return text;
    }
    return null;
}

function matchAmountElement(block: string): string | null {
    // Entry Amt usually appears before CdtDbtInd or right after NtryRef.
    const re = /<([^:\s>]+?:)?Amt\b[^>]*>([^<]+)<\/([^:\s>]+?:)?Amt>/i;
    const match = re.exec(block);
    return match ? (match[2] ?? '').trim() : null;
}

function stripTags(value: string): string {
    return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
}

function parseDecimalToCents(raw: string): number | null {
    const cleaned = raw.replace(/\s/g, '').replace(',', '.');
    if (!cleaned) return null;
    const value = Number(cleaned);
    return Number.isFinite(value) ? Math.round(value * 100) : null;
}

function normaliseIsoDate(raw: string): string | null {
    const trimmed = raw.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
    if (/^\d{8}$/.test(trimmed))
        return `${trimmed.slice(0, 4)}-${trimmed.slice(4, 6)}-${trimmed.slice(6, 8)}`;
    return null;
}
