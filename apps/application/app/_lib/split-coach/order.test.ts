import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { orderSplitTips } from './evaluate';
import type { SplitTip } from './types';

describe('orderSplitTips', () => {
    it('puts warnings first and keeps rule order inside each group', () => {
        const tips: SplitTip[] = [
            { id: 'a', severity: 'info' },
            { id: 'b', severity: 'warn' },
            { id: 'c', severity: 'info' },
            { id: 'd', severity: 'warn' },
        ];
        assert.deepEqual(
            orderSplitTips(tips).map(tip => tip.id),
            ['b', 'd', 'a', 'c']
        );
    });

    it('does not mutate its input', () => {
        const tips: SplitTip[] = [
            { id: 'a', severity: 'info' },
            { id: 'b', severity: 'warn' },
        ];
        orderSplitTips(tips);
        assert.equal(tips[0]?.id, 'a');
    });
});
