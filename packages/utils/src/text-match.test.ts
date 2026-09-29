import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { containsWord, findByName, findByNameOrAlias, namesMatch } from './text-match';

describe('namesMatch', () => {
    it('trims and ignores case', () => {
        assert.equal(namesMatch('  Odido ', 'odido'), true);
        assert.equal(namesMatch('Zilveren Kruis', 'zilveren kruis'), true);
    });

    it('treats nullish as empty', () => {
        assert.equal(namesMatch(null, ''), true);
        assert.equal(namesMatch(undefined, 'x'), false);
    });
});

describe('findByName', () => {
    it('returns the first case-insensitive name hit', () => {
        const rows = [{ name: 'KPN' }, { name: 'Odido' }];
        assert.equal(findByName(rows, ' odido ')?.name, 'Odido');
        assert.equal(findByName(rows, 'missing'), null);
        assert.equal(findByName(rows, '  '), null);
    });
});

describe('findByNameOrAlias', () => {
    it('matches display name or an alias', () => {
        const rows = [
            { name: 'Mobile phone', aliases: ['Mobiele telefoon', 'Teléfono móvil'] },
            { name: 'Internet', aliases: ['Internet'] },
        ];
        assert.equal(findByNameOrAlias(rows, 'Mobiele telefoon')?.name, 'Mobile phone');
        assert.equal(findByNameOrAlias(rows, 'mobile phone')?.name, 'Mobile phone');
        assert.equal(findByNameOrAlias(rows, 'missing'), null);
    });
});

describe('containsWord', () => {
    it('matches whole words case-insensitively', () => {
        assert.equal(containsWord('NS GROEP IZ NS REIZIGERS', 'ns'), true);
        assert.equal(containsWord('ING BANK NV', 'ing'), true);
        assert.equal(containsWord('PLUS Supermarkt', 'plus'), true);
        assert.equal(containsWord('HEMA 1234 Amsterdam', 'HEMA'), true);
        assert.equal(containsWord("MCDONALD'S 0421", "McDonald's"), true);
    });

    it('does not match inside longer words', () => {
        assert.equal(containsWord('Belastingdienst Apeldoorn', 'ns'), false);
        assert.equal(containsWord('Booking.com Amsterdam', 'ing'), false);
        assert.equal(containsWord('SNS Bank', 'ns'), false);
        assert.equal(containsWord('zooplus SE', 'plus'), false);
        assert.equal(containsWord('Adidas Store', 'da'), false);
    });

    it('ignores word edges on non-word needle ends', () => {
        assert.equal(containsWord('MICROSOFT*XBOX LIVE', 'microsoft*'), true);
        assert.equal(containsWord('bol.com bv', 'bol.com'), true);
    });

    it('rejects empty needles', () => {
        assert.equal(containsWord('anything', '   '), false);
    });
});
