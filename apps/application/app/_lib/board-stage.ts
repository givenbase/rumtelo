/**
 * The board ladder on the client (Clarity 3, CL-12).
 *
 * The server computes `MoneyProgress.stage` (data + paid-plan floor). The client only adds
 * what is personal or local: the Practice preview and "Show everything now". The stage
 * decides what is shown UP FRONT. It never gates a route or a procedure; plan and role
 * stay in `capability-access.ts` / `route-capabilities.ts`.
 */
import { BOARD_STAGE_ORDER, BoardStage, boardStageAtLeast } from '@rumtelo/contracts';

export { BOARD_STAGE_ORDER, BoardStage };

export function stageAtLeast(stage: BoardStage, minimum: BoardStage): boolean {
    return boardStageAtLeast(stage, minimum);
}

export type ServerStageRead = {
    status: 'pending' | 'error' | 'success';
    stage?: BoardStage;
};

export type EffectiveStage = {
    stage: BoardStage;
    /** False only while the first read is in flight (the shell reserves the Growth slot). */
    ready: boolean;
};

/**
 * The stage the UI uses for this person right now.
 * - Practice preview and show-all: the full board, no wait.
 * - Pending: full board for the rows (opened later), but not `ready` (no flash of a tab).
 * - Error: fail open to the full board, and ready. A failed read never hides what is paid for.
 */
export function effectiveStage(input: {
    previewActive: boolean;
    showAll: boolean;
    server: ServerStageRead;
}): EffectiveStage {
    if (input.previewActive || input.showAll) return { stage: BoardStage.MONTH, ready: true };
    if (input.server.status === 'success' && input.server.stage) {
        return { stage: input.server.stage, ready: true };
    }
    if (input.server.status === 'error') return { stage: BoardStage.MONTH, ready: true };
    return { stage: BoardStage.MONTH, ready: false };
}

/** What happens to the "New in your menu" note when the stage is read on this device. */
export type StageNoteDecision =
    | { action: 'none' }
    /** Write the current stage silently (first visit on a device, or the stage fell). */
    | { action: 'remember' }
    /** Show the note for the stages between `seen` and `current`. */
    | { action: 'show'; from: BoardStage };

export function decideStageNote(
    seen: BoardStage | null,
    current: BoardStage,
    suppressed: boolean
): StageNoteDecision {
    if (suppressed) return { action: 'none' };
    if (seen === null) return { action: 'remember' };
    if (seen === current) return { action: 'none' };
    if (stageAtLeast(seen, current)) return { action: 'remember' };
    return { action: 'show', from: seen };
}

export function isBoardStage(value: unknown): value is BoardStage {
    return typeof value === 'string' && (BOARD_STAGE_ORDER as readonly string[]).includes(value);
}

export type StageTrigger = 'week_check' | 'month_close' | 'sorting';

/** What brings this stage up front (copy key suffix). SPLIT has no trigger: it is day 1. */
export function stageTrigger(stage: BoardStage): StageTrigger | null {
    switch (stage) {
        case BoardStage.SORTING:
            return 'sorting';
        case BoardStage.ROUTINE:
            return 'week_check';
        case BoardStage.MONTH:
            return 'month_close';
        default:
            return null;
    }
}
