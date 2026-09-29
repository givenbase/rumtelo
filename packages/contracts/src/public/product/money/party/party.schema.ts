/**
 * Party Schemas
 * A household's own saved "other side" of a money row — employer, landlord,
 * client, lender, shop — when it is not in the Rumtelo merchant catalog.
 * Zod only — no `export type` beyond the same-module merge below.
 */

import { z } from 'zod';

import { HouseholdId, Id } from '../../../../common/common.schema';
import { MerchantSuggestionStatus } from '../enums';

/**
 * Every money row that names another side carries the same triple:
 *
 * | state          | `counterparty` | `merchantKey` | `partyId` |
 * |----------------|----------------|---------------|-----------|
 * | catalog pick   | preset name    | set           | null      |
 * | saved party    | party name     | null          | set       |
 * | one-off text   | typed text     | null          | null      |
 *
 * `merchantKey` and `partyId` are mutually exclusive; `counterparty` is always
 * the display snapshot so history survives a retired preset or deleted party.
 *
 * No `.default(null)` on purpose: Zod applies defaults through `.partial()`, so an
 * update that omits a key would silently unlink. Omitted = untouched; send `null`
 * to clear.
 */
export const CounterpartyRef = z.object({
    counterparty: z.string().max(160).nullable(),
    /** MerchantPreset.key when picked from the Rumtelo catalog. */
    merchantKey: z.string().min(1).max(64).nullable(),
    /** Household Party id when picked from (or saved to) their own list. */
    partyId: Id.nullable(),
});

/** Write-side flag: turn a free-typed `counterparty` into a saved Party for next time. */
export const SaveParty = z.object({
    saveParty: z.boolean().optional(),
});

export const Party = z.object({
    id: Id,
    householdId: HouseholdId,
    /** Display name — unique per household (case-insensitive). */
    name: z.string().min(1).max(160),
    /** Household note ("landlord since 2021", "invoice on the 25th"). */
    note: z.string().max(280).nullable().default(null),
    /** Other spellings seen on statements; used for autocomplete + bank matching. */
    aliases: z.array(z.string().min(1).max(160)).max(20).default([]),
    /**
     * Catalog merchant this party was matched to (set when Rumtelo accepts a
     * suggestion). Rows keep pointing at the party; branding can fall back to it.
     */
    merchantKey: z.string().min(1).max(64).nullable().default(null),
    /** CSS color token for chips / avatars. */
    color: z.string().max(64).nullable().default(null),
    /** Emoji for the chip. */
    icon: z.string().max(8).nullable().default(null),
    /** Favicon hostname — client builds logo URL. */
    logoDomain: z.string().max(120).nullable().default(null),
    website: z.string().max(240).nullable().default(null),
});

/** Where a party is used — drives the "in use" notice before delete. */
export const PartyUsage = z.object({
    incomeSources: z.int().min(0),
    fixedCosts: z.int().min(0),
    transactions: z.int().min(0),
    debts: z.int().min(0),
});

export const PartyWithUsage = Party.extend({
    usage: PartyUsage,
    /** Null when this party has never been suggested to the catalog. */
    suggestionStatus: z.enum(MerchantSuggestionStatus).nullable().default(null),
});

/** Result of nominating a party for the Rumtelo catalog. */
export const PartySuggestResult = z.object({
    partyId: Id,
    suggestionId: Id,
    status: z.enum(MerchantSuggestionStatus),
    householdCount: z.int().min(1),
});

// Inferred types (same-module merge for consumers)
export type CounterpartyRef = z.infer<typeof CounterpartyRef>;
export type SaveParty = z.infer<typeof SaveParty>;
export type Party = z.infer<typeof Party>;
export type PartyUsage = z.infer<typeof PartyUsage>;
export type PartyWithUsage = z.infer<typeof PartyWithUsage>;
export type PartySuggestResult = z.infer<typeof PartySuggestResult>;
export { MerchantSuggestionStatus };
