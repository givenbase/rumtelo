/**
 * Bank sync procedures — Enable Banking AIS connect / sync / disconnect.
 */

import { oc } from '@orpc/contract';
import { z } from 'zod';

import { HouseholdScoped } from '../../../../common/common.schema';
import {
    BankInstitution,
    BankSyncCompleteLink,
    BankSyncCompleteLinkResult,
    BankSyncDisconnect,
    BankSyncStartLink,
    BankSyncStartLinkResult,
    BankSyncStatus,
    BankSyncSyncNow,
    BankSyncSyncResult,
    BankSyncSyncStaleResult,
} from './bank-sync.schema';

const ok = z.object({ ok: z.literal(true) });

// ====================================================================
// ? CREATE Operations
// ====================================================================

export const bankSyncStartLink = oc.input(BankSyncStartLink).output(BankSyncStartLinkResult);

export const bankSyncCompleteLink = oc
    .input(BankSyncCompleteLink)
    .output(BankSyncCompleteLinkResult);

// ====================================================================
// ? READ Operations
// ====================================================================

export const bankSyncStatus = oc.input(HouseholdScoped).output(BankSyncStatus);

export const bankSyncListInstitutions = oc
    .input(HouseholdScoped.extend({ country: z.string().length(2).optional() }))
    .output(z.array(BankInstitution));

// ====================================================================
// ? UPDATE Operations
// ====================================================================

export const bankSyncSyncNow = oc.input(BankSyncSyncNow).output(BankSyncSyncResult);

/** Pull stale linked seats (used on Money visit — no-op when fresh or disabled). */
export const bankSyncSyncStale = oc.input(HouseholdScoped).output(BankSyncSyncStaleResult);

// ====================================================================
// ? DELETE Operations
// ====================================================================

export const bankSyncDisconnect = oc.input(BankSyncDisconnect).output(ok);

/** Nested contract object mounted at `contract.money.bankSync`. */
export const bankSyncContract = {
    status: bankSyncStatus,
    listInstitutions: bankSyncListInstitutions,
    startLink: bankSyncStartLink,
    completeLink: bankSyncCompleteLink,
    syncNow: bankSyncSyncNow,
    syncStale: bankSyncSyncStale,
    disconnect: bankSyncDisconnect,
};
