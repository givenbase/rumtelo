import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { BoardStage } from '../../../platform/enums';
import { BOARD_STAGE_ORDER, boardStageAtLeast, maxBoardStage } from './progress.util';

describe('board stage order', () => {
    it('walks SPLIT, SORTING, ROUTINE, MONTH', () => {
        assert.deepEqual(BOARD_STAGE_ORDER, ['SPLIT', 'SORTING', 'ROUTINE', 'MONTH']);
    });

    it('a higher stage includes everything below', () => {
        assert.equal(boardStageAtLeast(BoardStage.MONTH, BoardStage.ROUTINE), true);
        assert.equal(boardStageAtLeast(BoardStage.ROUTINE, BoardStage.ROUTINE), true);
        assert.equal(boardStageAtLeast(BoardStage.SORTING, BoardStage.ROUTINE), false);
    });

    it('maxBoardStage picks the later stage and ignores null', () => {
        assert.equal(maxBoardStage(BoardStage.SPLIT, BoardStage.MONTH), BoardStage.MONTH);
        assert.equal(maxBoardStage(BoardStage.ROUTINE, BoardStage.SORTING), BoardStage.ROUTINE);
        assert.equal(maxBoardStage(BoardStage.SORTING, null), BoardStage.SORTING);
    });
});
