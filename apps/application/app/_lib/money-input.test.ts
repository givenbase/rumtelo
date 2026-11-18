import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseLocaleAmount } from './money-input';

const ok = (minor: number) => ({ ok: true, minor });
const fail = (reason: string) => ({ ok: false, reason });

describe('parseLocaleAmount', () => {
    const rows: [string, string, unknown][] = [
        // Both separators: the last one is the decimal mark, in every locale.
        ['1.234,56', 'nl', ok(123456)],
        ['1.234,56', 'en', ok(123456)],
        ['1,234.56', 'nl', ok(123456)],
        ['1,234.56', 'en', ok(123456)],
        ['234.567,89', 'nl', ok(23456789)],
        ['1.234.567,89', 'nl', fail('too_large')],
        // One separator, once, not three digits after: decimal mark.
        ['1234,56', 'nl', ok(123456)],
        ['1234,56', 'en', ok(123456)],
        ['1234.5', 'en', ok(123450)],
        ['12,5', 'nl', ok(1250)],
        // One separator, once, three digits after: the locale decides.
        ['1.234', 'nl', ok(123400)],
        ['1.234', 'en', fail('too_many_decimals')],
        ['1,234', 'nl', fail('too_many_decimals')],
        ['1,234', 'en', ok(123400)],
        ['€ 2.850', 'nl', ok(285000)],
        ['€ 2.850', 'en', fail('too_many_decimals')],
        // One separator, more than once: group marks.
        ['1.234.567', 'nl', fail('too_large')],
        ['234.567', 'nl', ok(23456700)],
        ['1,234,567', 'en', fail('too_large')],
        ['234,567', 'en', ok(23456700)],
        ['1,234,56', 'en', fail('not_a_number')],
        // Plain integers and zero.
        ['2850', 'nl', ok(285000)],
        ['2850', 'en', ok(285000)],
        ['0', 'nl', ok(0)],
        ['0', 'en', ok(0)],
        ['  2 850 ', 'nl', ok(285000)],
        ['$1,000', 'en', ok(100000)],
        ['£12.30', 'en', ok(1230)],
        ['5.', 'en', ok(500)],
        // Rejections.
        ['', 'nl', fail('empty')],
        ['   ', 'en', fail('empty')],
        ['-5', 'nl', fail('negative')],
        ['-5', 'en', fail('negative')],
        ['abc', 'nl', fail('not_a_number')],
        ['12abc', 'en', fail('not_a_number')],
        ['.', 'en', fail('not_a_number')],
        ['1.23.45', 'nl', fail('not_a_number')],
        ['1.2,3,4', 'nl', fail('not_a_number')],
        ['0.123', 'nl', fail('not_a_number')],
        ['12,345', 'nl', fail('too_many_decimals')],
        ['10,999.999', 'en', fail('too_many_decimals')],
        ['1.000.000,01', 'nl', fail('too_large')],
        ['99999999999', 'en', fail('too_large')],
    ];

    for (const [input, locale, expected] of rows) {
        it(`${JSON.stringify(input)} (${locale})`, () => {
            assert.deepEqual(parseLocaleAmount(input, locale), expected);
        });
    }

    it('accepts the cap exactly', () => {
        assert.deepEqual(parseLocaleAmount('1.000.000,00', 'nl'), ok(100_000_000));
    });

    it('never goes through a float multiply (0.29 stays 29)', () => {
        assert.deepEqual(parseLocaleAmount('0,29', 'nl'), ok(29));
        assert.deepEqual(parseLocaleAmount('1.15', 'en'), ok(115));
    });

    it('reads regional tags and decimal-comma locales', () => {
        assert.deepEqual(parseLocaleAmount('1.234', 'nl-NL'), ok(123400));
        assert.deepEqual(parseLocaleAmount('1.234', 'es'), ok(123400));
        assert.deepEqual(parseLocaleAmount('1,234', 'en-GB'), ok(123400));
    });
});
