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

describe('detectCsvDialect', () => {
    it('fingerprints ING vs Revolut vs Rabobank', async () => {
        const { detectCsvDialect, csvDialectMismatchesBank, dialectFromFileName } =
            await import('./detect-csv-dialect');
        expect(
            detectCsvDialect(
                'Datum;Naam / Omschrijving;Rekening;Tegenrekening;Code;Af Bij;Bedrag (EUR);Mutatiesoort;Mededelingen\n'
            )
        ).toBe('nl.ing');
        expect(
            detectCsvDialect(
                'Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance\n'
            )
        ).toBe('nl.revolut');
        expect(
            detectCsvDialect(
                '"IBAN/BBAN","Munt","Datum","Bedrag","Naam tegenpartij","Omschrijving-1"\n'
            )
        ).toBe('nl.rabobank');
        expect(csvDialectMismatchesBank('nl.revolut', 'ING')).toBe(true);
        expect(csvDialectMismatchesBank('nl.ing', 'ING')).toBe(false);
        // CAMT-only / unmapped banks still reject a foreign dialect
        expect(csvDialectMismatchesBank('nl.revolut', 'ABN_AMRO')).toBe(true);
        expect(csvDialectMismatchesBank('nl.ing', 'N26')).toBe(true);
        expect(csvDialectMismatchesBank('nl.revolut', 'REVOLUT')).toBe(false);
        expect(csvDialectMismatchesBank(null, 'ABN_AMRO')).toBe(false);
        expect(dialectFromFileName('Revolut Account Statement Sept 2026.csv')).toBe('nl.revolut');
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

    it('parses CSV with Excel sep= preamble', () => {
        const csv = [
            'sep=;',
            'Datum;Bedrag;Omschrijving;Tegenrekening',
            '22-09-2026;-42,50;AH Beurs;NL00BANK0123456789',
            '11-09-2026;1850,00;Salaris;',
        ].join('\n');
        const result = parseStatement(csv);
        expect(result.format).toBe('csv');
        expect(result.rows).toHaveLength(2);
        expect(result.rows[0]).toMatchObject({
            bookedOn: '2026-09-22',
            amount: -4250,
            description: 'AH Beurs',
        });
        expect(result.rows[1]).toMatchObject({
            bookedOn: '2026-09-11',
            amount: 185_000,
        });
    });

    it('parses ING CSV (Af/Bij + Naam / Omschrijving)', () => {
        const csv = [
            'Datum;Naam / Omschrijving;Rekening;Tegenrekening;Code;Af Bij;Bedrag (EUR);Mutatiesoort;Mededelingen;Saldo na mutatie;Tag',
            '22-09-2026;Albert Heijn;NL00INGB0123456789;NL00BANK0123456789;IC;Af;42,50;Betaalautomaat;AH Beurs;100,00;',
            '11-09-2026;RETAIL GROUP;NL00INGB0123456789;;GT;Bij;1850,00;Online bankieren;Salaris;1950,00;',
        ].join('\n');
        const result = parseStatement(csv, 'csv');
        expect(result.rows).toHaveLength(2);
        expect(result.csvDialect).toBe('nl.ing');
        expect(result.rows[0]).toMatchObject({
            bookedOn: '2026-09-22',
            amount: -4250,
            counterparty: 'Albert Heijn',
            description: 'AH Beurs',
        });
        expect(result.rows[1]).toMatchObject({
            bookedOn: '2026-09-11',
            amount: 185_000,
            counterparty: 'RETAIL GROUP',
            description: 'Salaris',
        });
    });

    it('parses Revolut personal CSV (EN decimals + datetime)', () => {
        const csv = [
            'Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance',
            'Card Payment,Current,2026-09-27 00:42:39,2026-09-28 13:19:10,Apple Store,-113.88,1.11,EUR,COMPLETED,196.16',
            'Topup,Current,2026-09-11 09:00:00,2026-09-11 09:00:01,Salary,1850.00,0.00,EUR,COMPLETED,1960.00',
        ].join('\n');
        const result = parseStatement(csv, 'csv');
        expect(result.rows).toHaveLength(2);
        expect(result.csvDialect).toBe('nl.revolut');
        expect(result.rows[0]).toMatchObject({
            bookedOn: '2026-09-28',
            amount: -11_388,
            description: 'Apple Store',
        });
        expect(result.rows[1]).toMatchObject({
            bookedOn: '2026-09-11',
            amount: 185_000,
            description: 'Salary',
        });
    });

    it('parses Rabobank 2018 CSV headers', () => {
        const csv = [
            '"IBAN/BBAN","Munt","BIC","Volgnr","Datum","Rentedatum","Bedrag","Saldo na trn","Tegenrekening IBAN/BBAN","Naam tegenpartij","Naam uiteindelijke partij","Naam initiërende partij","BIC tegenpartij","Code","Batch ID","Transactiereferentie","Machtigingskenmerk","Incassant ID","Betalingskenmerk","Omschrijving-1","Omschrijving-2","Omschrijving-3","Reden retour","Oorspr bedrag","Oorspr munt","Koers"',
            '"NL00RABO1234567890","EUR","RABONL2U","1","2026-09-22","2026-09-22","-42,50","+100,00","NL00BANK0123456789","Albert Heijn","","","","","","","","","","AH Beurs","","","","","",""',
        ].join('\n');
        const result = parseStatement(csv, 'csv');
        expect(result.rows).toHaveLength(1);
        expect(result.csvDialect).toBe('nl.rabobank');
        expect(result.rows[0]).toMatchObject({
            bookedOn: '2026-09-22',
            amount: -4250,
            counterparty: 'Albert Heijn',
            description: 'AH Beurs',
        });
    });
});
