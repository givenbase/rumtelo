/**
 * Plan Schemas
 * Commercial plan tiers — limits, capabilities, catalog DTOs.
 */

import { z } from 'zod';

import { Money } from '../../common/common.schema';
import { HouseholdKind } from '../../enums';
import { CAPABILITY_KEYS } from './capabilities';
import { CapabilityKind, PlanKey } from './enums';

// ====================================================================
// Limits & Capabilities
// ====================================================================

/** Named capacity ceilings — null = unlimited. */
export const PlanLimits = z.object({
    /** Total household seats (owner included). null = unlimited. */
    maxMembers: z.int().positive().nullable(),
    /**
     * Writable seats: OWNER + ADMIN + MEMBER (not viewer).
     * null = unlimited. Distinct from {@link SeatAddonKind} / BA role strings.
     */
    maxWritableMembers: z.int().positive().nullable(),
    /** Viewer / look-along seats. null = unlimited. */
    maxViewerMembers: z.int().min(0).nullable(),
    maxGoals: z.int().positive().nullable(),
    maxAssets: z.int().positive().nullable(),
    maxIncomeStreams: z.int().positive().nullable(),
    maxLearnEntries: z.int().positive().nullable(),
    /** Live Open Banking linked seats. 0 = none (Basic). null = unlimited. */
    maxBankLinks: z.int().min(0).nullable(),
});

export const PlanCapabilities = z.object({
    /** Ceiling on household members (owner included). null = unlimited. */
    maxMembers: z.int().positive().nullable(),
    /** Writable seats (OWNER + ADMIN + MEMBER). null = unlimited. */
    maxWritableMembers: z.int().positive().nullable(),
    /** Viewer / look-along seats. null = unlimited. */
    maxViewerMembers: z.int().min(0).nullable(),
    /** Goals create ceiling. null = unlimited. */
    maxGoals: z.int().positive().nullable(),
    /** Net-worth assets ceiling. null = unlimited. */
    maxAssets: z.int().positive().nullable(),
    /** Growth income/lever streams ceiling. null = unlimited. */
    maxIncomeStreams: z.int().positive().nullable(),
    /** Learn entries ceiling. null = unlimited. */
    maxLearnEntries: z.int().positive().nullable(),
    /** Live AIS linked seats ceiling. 0 = none. null = unlimited. */
    maxBankLinks: z.int().min(0).nullable(),
    /** Household shapes this tier may use. Basic = solo only. */
    householdKinds: z.array(z.enum(HouseholdKind)).min(1),
    /** Flat capability keys granted on this tier (derived from PLAN_ACCESS). */
    capabilityKeys: z.array(z.enum(CAPABILITY_KEYS)),
    /** Whether invites are allowed (mirrors platform-invite). */
    canInvite: z.boolean(),
});

/**
 * Purchased seat add-ons beyond the plan’s included matrix.
 * `extraContributor` / `extraViewer` are inventory counts — not roles.
 */
export const SeatExtras = z.object({
    extraContributor: z.int().nonnegative().default(0),
    extraViewer: z.int().nonnegative().default(0),
});

/** Effective caps after included plan limits + purchased extras. */
export const EffectiveSeatCaps = z.object({
    maxMembers: z.int().positive().nullable(),
    maxWritable: z.int().positive().nullable(),
    maxViewer: z.int().min(0).nullable(),
});

// ====================================================================
// Catalog metadata
// ====================================================================

/** Catalog metadata for each capability key (seed / Settings / docs). */
export const CapabilityDefinition = z.object({
    key: z.enum(CAPABILITY_KEYS),
    kind: z.enum(CapabilityKind),
    name: z.string(),
    description: z.string(),
    sortOrder: z.int(),
});

// ====================================================================
// Plan catalog DTOs
// ====================================================================

export const PlanCatalogItem = z.object({
    key: z.enum(PlanKey),
    name: z.string(),
    /** List price per month in eurocents; 0 = free tier. */
    priceMonthly: Money,
    capabilities: PlanCapabilities,
    sortOrder: z.int(),
    isActive: z.boolean(),
});

/** Link row shape — which plan grants which capability (DB mirror). */
export const PlanCapabilityGrant = z.object({
    planKey: z.enum(PlanKey),
    capabilityKey: z.enum(CAPABILITY_KEYS),
});

// Inferred types (same-module merge for consumers)
export type PlanLimits = z.infer<typeof PlanLimits>;
export type PlanLimitKey = keyof PlanLimits;
export type PlanCapabilities = z.infer<typeof PlanCapabilities>;
export type SeatExtras = z.infer<typeof SeatExtras>;
export type EffectiveSeatCaps = z.infer<typeof EffectiveSeatCaps>;
export type CapabilityDefinition = z.infer<typeof CapabilityDefinition>;
export type PlanCatalogItem = z.infer<typeof PlanCatalogItem>;
export type PlanCapabilityGrant = z.infer<typeof PlanCapabilityGrant>;
