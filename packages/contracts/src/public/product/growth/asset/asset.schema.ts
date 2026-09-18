/**
 * Asset Schemas (Growth)
 * What a household owns. The class is a catalog key, not an enum.
 */

import { z } from 'zod';

import { HouseholdId, Id, Money } from '../../../../common/common.schema';

/** One thing this household owns. */
export const Asset = z.object({
    id: Id,
    householdId: HouseholdId,
    name: z.string().min(1).max(120),
    /** AssetKind.key. A snapshot, not a live foreign key. */
    kindKey: z.string().min(1).max(64),
    /** AssetPreset.key when they picked a suggestion. Null when they typed a name. */
    presetKey: z.string().min(1).max(64).nullable(),
    /** What it is worth, in minor units. */
    value: Money,
    /** What it pays each month, in minor units. Zero when it only sits there. */
    flow: Money,
});

export type Asset = z.infer<typeof Asset>;
