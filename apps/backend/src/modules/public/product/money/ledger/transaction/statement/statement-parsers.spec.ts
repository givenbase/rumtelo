import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { parseCamt053 } from './camt053-parser';
import { detectStatementFormat } from './detect-format';
import { parseMt940 } from './mt940-parser';
import { parseStatement } from './parse-statement';

const fixturesDir = join(
    dirname(fileURLToPath(import.meta.url)),
    '../../../../../../../../../../docs/engineering/fixtures'
);

function fixture(name: string): string {
    return readFileSync(join(fixturesDir, name), 'utf8');
}

describe('detectStatementFormat', () => {
    it('detects CAMT.053 XML', () => {
        expect(detectStatementFormat(fixture('statement-sample-nl.camt053.xml'))).toBe('camt053');
    });

    it('detects MT940', () => {
        expect(detectStatementFormat(fixture('statement-sample-nl.mt940.sta'))).toBe('mt940');
    });

    it('falls back to CSV', () => {
        expect(detectStatementFormat('datum;bedrag;omschrijving\n2026-09-01;-10,00;Test')).toBe(
            'csv'
        );
    });
});

describe('parseCamt053', () => {
    it('parses the NL sample fixture', () => {
        const rows = parseCamt053(fixture('statement-sample-nl.camt053.xml'));
        expect(rows).toHaveLength(5);
        expect(rows[0]).toMatchObject({
            bookedOn: '2026-09-22',
            amount: -4250,
            description: 'AH 1582 AMSTERDAM BEURS',
            counterparty: 'ALBERT HEIJN 1582',
        });
        expect(rows[1]).toMatchObject({
            bookedOn: '2026-09-11',
            amount: 185_000,
            description: 'Salaris september',
            counterparty: 'RETAIL GROUP NL BV',
        });
    });

    it('returns empty for garbage', () => {
        expect(parseCamt053('<not-a-statement/>')).toEqual([]);
    });
});

describe('parseMt940', () => {
    it('parses the NL sample fixture', () => {
        const rows = parseMt940(fixture('statement-sample-nl.mt940.sta'));
        expect(rows).toHaveLength(5);
        expect(rows[0]).toMatchObject({
            bookedOn: '2026-09-22',
            amount: -4250,
            description: 'AH 1582 AMSTERDAM BEURS',
            counterparty: 'ALBERT HEIJN 1582',
        });
        expect(rows[1]).toMatchObject({
            bookedOn: '2026-09-11',
            amount: 185_000,
            description: 'Salaris september',
            counterparty: 'RETAIL GROUP NL BV',
        });
    });

    it('returns empty for garbage', () => {
        expect(parseMt940('hello world')).toEqual([]);
    });
});

describe('parseStatement', () => {
    it('auto-routes CAMT and MT940 fixtures', () => {
        const camt = parseStatement(fixture('statement-sample-nl.camt053.xml'));
        expect(camt.format).toBe('camt053');
        expect(camt.rows).toHaveLength(5);

        const mt = parseStatement(fixture('statement-sample-nl.mt940.sta'));
        expect(mt.format).toBe('mt940');
        expect(mt.rows).toHaveLength(5);
    });
});
