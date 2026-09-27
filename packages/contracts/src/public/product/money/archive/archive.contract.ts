/**
 * Archive Contract
 * Restore a Rumtelo JSON household export (dry-run → confirm).
 */

import { oc } from '@orpc/contract';

import { ArchiveRestoreInput, ArchiveRestoreResult } from './archive.schema';

// ====================================================================
// ? CREATE Operations
// ====================================================================

export const archiveRestore = oc.input(ArchiveRestoreInput).output(ArchiveRestoreResult);

/** Nested contract object mounted at `contract.money.archive`. */
export const archiveContract = {
    restore: archiveRestore,
};
