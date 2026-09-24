/**
 * Bank sync (Enable Banking AIS) — wire schemas.
 */

import { z } from 'zod';

import { HouseholdId, Id } from '../../../../common/common.schema';

export const BankSyncStatus = z.object({
    enabled: z.boolean(),
    connectedAccountIds: z.array(Id),
});

export const BankInstitution = z.object({
    id: z.string().min(1).max(200),
    name: z.string().min(1).max(200),
    country: z.string().length(2),
    logo: z.string().max(500).nullable(),
});

export const BankSyncStartLink = z.object({
    householdId: HouseholdId,
    bankAccountId: Id,
    institutionId: z.string().min(1).max(200),
});

export const BankSyncStartLinkResult = z.object({
    authUrl: z.url(),
});

export const BankSyncCompleteLink = z.object({
    householdId: HouseholdId,
    /** OAuth `code` from Enable Banking redirect. */
    code: z.string().min(1).max(4000),
    /** Echo of `state` — Rumtelo bank-account id. */
    state: Id,
});

export const BankSyncCompleteLinkResult = z.object({
    bankAccountId: Id,
    connectionId: z.string().min(1),
    institutionName: z.string().min(1),
    expiresAt: z.string().nullable(),
});

export const BankSyncSyncNow = z.object({
    householdId: HouseholdId,
    bankAccountId: Id,
});

export const BankSyncSyncResult = z.object({
    imported: z.int(),
    skipped: z.int(),
    sorted: z.int(),
});

/** Pull linked seats that have not synced recently (on-open opportunistic). */
export const BankSyncSyncStaleResult = z.object({
    /** Seats that were pulled this call. */
    synced: z.int(),
    /** New Inbox rows across those seats. */
    imported: z.int(),
});

export const BankSyncDisconnect = z.object({
    householdId: HouseholdId,
    bankAccountId: Id,
});

export type BankSyncStatus = z.infer<typeof BankSyncStatus>;
export type BankInstitution = z.infer<typeof BankInstitution>;
export type BankSyncStartLink = z.infer<typeof BankSyncStartLink>;
export type BankSyncStartLinkResult = z.infer<typeof BankSyncStartLinkResult>;
export type BankSyncCompleteLink = z.infer<typeof BankSyncCompleteLink>;
export type BankSyncCompleteLinkResult = z.infer<typeof BankSyncCompleteLinkResult>;
export type BankSyncSyncNow = z.infer<typeof BankSyncSyncNow>;
export type BankSyncSyncResult = z.infer<typeof BankSyncSyncResult>;
export type BankSyncSyncStaleResult = z.infer<typeof BankSyncSyncStaleResult>;
export type BankSyncDisconnect = z.infer<typeof BankSyncDisconnect>;
