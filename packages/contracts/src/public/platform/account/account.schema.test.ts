import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { AccountDirectionText, AccountSettings } from './account.schema';
import { accountUpdateSettings } from './account.contract';

describe('AccountDirectionText', () => {
    it('trims and keeps up to 280 characters', () => {
        assert.equal(AccountDirectionText.parse('  Debt free  '), 'Debt free');
        assert.equal(AccountDirectionText.parse('a'.repeat(280)).length, 280);
    });

    it('rejects 281 characters', () => {
        assert.equal(AccountDirectionText.safeParse('a'.repeat(281)).success, false);
    });

    it('lets an empty string through so the service can store it as null', () => {
        assert.equal(AccountDirectionText.parse('   '), '');
    });
});

describe('account settings update input', () => {
    const input = accountUpdateSettings['~orpc'].inputSchema!;

    it('treats undefined as leave and null as clear', () => {
        assert.deepEqual(input['~standard'].validate({}), { value: {} });
        const cleared = input['~standard'].validate({ direction: null, directionWhy: null });
        assert.deepEqual(cleared, { value: { direction: null, directionWhy: null } });
    });

    it('rejects 281 characters in either field', () => {
        const tooLong = 'a'.repeat(281);
        for (const field of ['direction', 'directionWhy']) {
            const result = input['~standard'].validate({ [field]: tooLong }) as {
                issues?: unknown[];
            };
            assert.ok(result.issues && result.issues.length > 0, field);
        }
    });
});

describe('account settings read shape', () => {
    it('carries both fields as nullable strings', () => {
        const shape = AccountSettings.shape;
        assert.equal(shape.direction.safeParse(null).success, true);
        assert.equal(shape.directionWhy.safeParse('So we can breathe').success, true);
    });
});
