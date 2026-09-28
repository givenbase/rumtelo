/**
 * Device Schemas
 * Household-owned hardware registry — member-assigned wearables and shared hubs.
 */

import { z } from 'zod';

import { HouseholdId, Id } from '../../../common/common.schema';
import { DeviceCapability, DeviceConnection } from '../enums';

export { DeviceCapability, DeviceConnection } from '../enums';
export {
    DeviceKindCatalogItem,
    type DeviceKindCatalogItem as DeviceKindCatalogItemType,
} from '../../../backoffice/reference/device-kind/device-kind.schema';

/** Household device row — kindKey snapshots the catalog; capabilities are the live set. */
export const Device = z.object({
    id: Id,
    householdId: HouseholdId,
    /** Wearing member (`auth.account.id`); null = shared household device. */
    accountId: Id.nullable(),
    name: z.string().trim().min(1).max(60),
    /** DeviceKindCatalogItem.key at pair time. */
    kindKey: z.string().trim().min(1).max(64),
    connection: z.enum(DeviceConnection),
    capabilities: z.array(z.enum(DeviceCapability)).min(1),
    vendor: z.string().trim().max(60).nullable(),
    model: z.string().trim().max(60).nullable(),
    /** BLE id, MAC, or cloud provider user/device id. */
    externalId: z.string().trim().max(120).nullable(),
    pairedAt: z.iso.datetime(),
    lastSeenAt: z.iso.datetime().nullable(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
});

export const DeviceCreate = z.object({
    name: z.string().trim().min(1).max(60),
    kindKey: z.string().trim().min(1).max(64),
    connection: z.enum(DeviceConnection).optional(),
    capabilities: z.array(z.enum(DeviceCapability)).min(1).optional(),
    /** Omit / null → shared; omit on wearable kinds defaults to current account. */
    accountId: Id.nullable().optional(),
    vendor: z.string().trim().max(60).nullable().optional(),
    model: z.string().trim().max(60).nullable().optional(),
    externalId: z.string().trim().max(120).nullable().optional(),
});

export const DeviceUpdate = z.object({
    id: Id,
    name: z.string().trim().min(1).max(60).optional(),
    accountId: Id.nullable().optional(),
    capabilities: z.array(z.enum(DeviceCapability)).min(1).optional(),
    vendor: z.string().trim().max(60).nullable().optional(),
    model: z.string().trim().max(60).nullable().optional(),
    lastSeenAt: z.iso.datetime().nullable().optional(),
});

export const DeviceListInput = z
    .object({
        /** When set, only devices that include this capability. */
        capability: z.enum(DeviceCapability).optional(),
    })
    .default({});

export type Device = z.infer<typeof Device>;
export type DeviceCreate = z.infer<typeof DeviceCreate>;
export type DeviceUpdate = z.infer<typeof DeviceUpdate>;
export type DeviceListInput = z.infer<typeof DeviceListInput>;
