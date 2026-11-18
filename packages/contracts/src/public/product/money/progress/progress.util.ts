/**
 * Board stage helpers shared by the backend (computation) and the apps (nav, Quick add).
 */

import { BoardStage } from '../../../platform/enums';

/** Stages from the first to the last; a higher stage includes everything below. */
export const BOARD_STAGE_ORDER: readonly BoardStage[] = [
    BoardStage.SPLIT,
    BoardStage.SORTING,
    BoardStage.ROUTINE,
    BoardStage.MONTH,
];

/** True when `stage` is `minimum` or later on the ladder. */
export function boardStageAtLeast(stage: BoardStage, minimum: BoardStage): boolean {
    return BOARD_STAGE_ORDER.indexOf(stage) >= BOARD_STAGE_ORDER.indexOf(minimum);
}

/** The later of two stages; a null side is ignored. */
export function maxBoardStage(first: BoardStage, second: BoardStage | null): BoardStage {
    return second && boardStageAtLeast(second, first) ? second : first;
}
