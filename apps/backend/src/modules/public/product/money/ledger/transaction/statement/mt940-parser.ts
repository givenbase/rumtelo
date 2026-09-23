import type { ParsedRow } from './parsed-row';

/**
 * Parse SWIFT MT940 customer statement text (`:61:` / `:86:`).
 * Amounts use European decimal commas; C/D sets credit/debit sign.
 */
export function parseMt940(content: string): ParsedRow[] {
    const normalised = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    // Join SWIFT continuation lines (leading space after CR/LF).
    const joined = normalised.replace(/\n:86:/g, '\n:86:').replace(/\n /g, '');

    const rows: ParsedRow[] = [];
    const tagRe = /:(61|86):([^\n]*(?:\n(?!:\d{2}[A-Z]?:)[^\n]*)*)/g;
    let pending: { bookedOn: string; amount: number } | null = null;
    let match: RegExpExecArray | null;

    while ((match = tagRe.exec(joined)) !== null) {
        const tag = match[1];
        const body = (match[2] ?? '').trim();
        if (tag === '61') {
            if (pending) {
                rows.push({
                    bookedOn: pending.bookedOn,
                    amount: pending.amount,
                    description: 'Geïmporteerd',
                    counterparty: null,
                });
            }
            pending = parseField61(body);
            continue;
        }
        if (tag === '86' && pending) {
            const { description, counterparty } = parseField86(body);
            rows.push({
                bookedOn: pending.bookedOn,
                amount: pending.amount,
                description,
                counterparty,
            });
            pending = null;
        }
    }

    if (pending) {
        rows.push({
            bookedOn: pending.bookedOn,
            amount: pending.amount,
            description: 'Geïmporteerd',
            counterparty: null,
        });
    }

    return rows;
}

/**
 * `:61:YYMMDD[MMDD]C|D[R]amountNREF…`
 * Amount may use comma decimals; optional funds code before amount.
 */
function parseField61(body: string): { bookedOn: string; amount: number } | null {
    const line = body.replace(/\n/g, '');
    const match = line.match(
        /^(\d{6})(\d{4})?([CD])(R?[A-Z]?)?(\d+,\d{0,2}|\d+)(N[A-Z]{3})?(.*)$/i
    );
    if (!match) return null;

    const yymmdd = match[1]!;
    const creditDebit = match[3]!.toUpperCase();
    const amountRaw = match[5]!;
    const bookedOn = yymmddToIso(yymmdd);
    if (!bookedOn) return null;

    const cents = parseMtAmount(amountRaw);
    if (cents === null) return null;

    const signed = creditDebit === 'D' ? -Math.abs(cents) : Math.abs(cents);
    return { bookedOn, amount: signed };
}

function parseField86(body: string): { description: string; counterparty: string | null } {
    const text = body.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    if (!text) return { description: 'Geïmporteerd', counterparty: null };

    // Common NL SEPA structured remittance: `/NAME/Acme BV/REMI/Invoice…`
    const nameMatch = text.match(/\/NAME\/([^/]+)/i);
    const remiMatch = text.match(/\/REMI\/([^/]+)/i);
    if (nameMatch || remiMatch) {
        const counterparty = nameMatch?.[1]?.trim() || null;
        const description = (remiMatch?.[1] ?? nameMatch?.[1] ?? text).trim();
        return { description: description || 'Geïmporteerd', counterparty };
    }

    // First slash-segment or whole line as description; try to peel a name.
    const parts = text
        .split(/\s{2,}|\s\/\s/)
        .map(part => part.trim())
        .filter(Boolean);
    const description = parts[0] || text;
    const counterparty = parts.length > 1 ? parts[1]! : null;
    return { description, counterparty };
}

function parseMtAmount(raw: string): number | null {
    const cleaned = raw.replace(/\s/g, '').replace(',', '.');
    const value = Number(cleaned);
    return Number.isFinite(value) ? Math.round(value * 100) : null;
}

/** MT940 value dates are YYMMDD (assume 2000–2099). */
function yymmddToIso(yymmdd: string): string | null {
    if (!/^\d{6}$/.test(yymmdd)) return null;
    const yy = Number(yymmdd.slice(0, 2));
    const mm = yymmdd.slice(2, 4);
    const dd = yymmdd.slice(4, 6);
    const year = yy >= 70 ? 1900 + yy : 2000 + yy;
    const iso = `${year}-${mm}-${dd}`;
    const check = Date.parse(iso);
    return Number.isFinite(check) ? iso : null;
}
