import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { shuffled } from './shuffle';

describe('shuffled', () => {
    it('returns a new array with the same members', () => {
        const input = [1, 2, 3, 4, 5] as const;
        const out = shuffled(input, () => 0);
        assert.notEqual(out, input);
        assert.deepEqual(
            [...out].sort((left, right) => left - right),
            [...input].sort((left, right) => left - right)
        );
    });

    it('uses random for index picks', () => {
        const values = [0.9, 0.1, 0.5];
        let i = 0;
        const out = shuffled(['a', 'b', 'c'], () => values[i++] ?? 0);
        assert.equal(out.length, 3);
        assert.deepEqual(
            [...out].sort((left, right) => left.localeCompare(right)),
            ['a', 'b', 'c']
        );
    });

    it('handles empty and singleton', () => {
        assert.deepEqual(shuffled([]), []);
        assert.deepEqual(shuffled(['only']), ['only']);
    });
});
