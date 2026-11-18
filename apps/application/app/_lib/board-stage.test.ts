import assert from 'node:assert/strict';
import { test } from 'node:test';

import { BoardStage } from '@rumtelo/contracts';

import { decideStageNote, effectiveStage, stageAtLeast, stageTrigger } from './board-stage';

test('stageAtLeast follows SPLIT, SORTING, ROUTINE, MONTH', () => {
    assert.equal(stageAtLeast(BoardStage.MONTH, BoardStage.ROUTINE), true);
    assert.equal(stageAtLeast(BoardStage.ROUTINE, BoardStage.ROUTINE), true);
    assert.equal(stageAtLeast(BoardStage.SORTING, BoardStage.ROUTINE), false);
    assert.equal(stageAtLeast(BoardStage.SPLIT, BoardStage.SPLIT), true);
});

test('effectiveStage: the server stage when it is read', () => {
    assert.deepEqual(
        effectiveStage({
            previewActive: false,
            showAll: false,
            server: { status: 'success', stage: BoardStage.SORTING },
        }),
        { stage: BoardStage.SORTING, ready: true }
    );
});

test('effectiveStage: loading reserves space (not ready), an error fails open to MONTH', () => {
    assert.deepEqual(
        effectiveStage({ previewActive: false, showAll: false, server: { status: 'pending' } }),
        { stage: BoardStage.MONTH, ready: false }
    );
    assert.deepEqual(
        effectiveStage({ previewActive: false, showAll: false, server: { status: 'error' } }),
        { stage: BoardStage.MONTH, ready: true }
    );
});

test('effectiveStage: Practice preview and show-all are MONTH at once, whatever the server says', () => {
    for (const flags of [
        { previewActive: true, showAll: false },
        { previewActive: false, showAll: true },
    ]) {
        for (const server of [
            { status: 'pending' as const },
            { status: 'success' as const, stage: BoardStage.SPLIT },
            { status: 'error' as const },
        ]) {
            assert.deepEqual(effectiveStage({ ...flags, server }), {
                stage: BoardStage.MONTH,
                ready: true,
            });
        }
    }
});

test('stage note: first visit on a device remembers silently, never shows "New:"', () => {
    assert.deepEqual(decideStageNote(null, BoardStage.MONTH, false), { action: 'remember' });
});

test('stage note: shows once when the stage rose, then not again', () => {
    assert.deepEqual(decideStageNote(BoardStage.SPLIT, BoardStage.ROUTINE, false), {
        action: 'show',
        from: BoardStage.SPLIT,
    });
    assert.deepEqual(decideStageNote(BoardStage.ROUTINE, BoardStage.ROUTINE, false), {
        action: 'none',
    });
});

test('stage note: a fallen stage is written silently; preview and show-all suppress it', () => {
    assert.deepEqual(decideStageNote(BoardStage.MONTH, BoardStage.SORTING, false), {
        action: 'remember',
    });
    assert.deepEqual(decideStageNote(BoardStage.SPLIT, BoardStage.MONTH, true), { action: 'none' });
});

test('stageTrigger names what brings each stage', () => {
    assert.equal(stageTrigger(BoardStage.SPLIT), null);
    assert.equal(stageTrigger(BoardStage.SORTING), 'sorting');
    assert.equal(stageTrigger(BoardStage.ROUTINE), 'week_check');
    assert.equal(stageTrigger(BoardStage.MONTH), 'month_close');
});
