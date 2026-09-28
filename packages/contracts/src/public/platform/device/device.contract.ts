/**
 * Device Contracts
 * Household device registry — pair, list, update, forget.
 */

import { oc } from '@orpc/contract';
import { z } from 'zod';

import { Id } from '../../../common/common.schema';
import { Device, DeviceCreate, DeviceListInput, DeviceUpdate } from './device.schema';
import { DeviceKindCatalogItem } from '../../../backoffice/reference/device-kind/device-kind.schema';

// ====================================================================
// ? CREATE Operations
// ====================================================================

export const deviceCreate = oc.input(DeviceCreate).output(Device);

// ====================================================================
// ? READ Operations
// ====================================================================

export const deviceList = oc.input(DeviceListInput).output(z.array(Device));

/** Active device-kind catalog for the pair dialog. */
export const deviceKinds = oc.output(z.array(DeviceKindCatalogItem));

// ====================================================================
// ? UPDATE Operations
// ====================================================================

export const deviceUpdate = oc.input(DeviceUpdate).output(Device);

// ====================================================================
// ? DELETE Operations
// ====================================================================

/** Forget a device — removes the registry row (readings stay for Phase 2). */
export const deviceDelete = oc
    .input(z.object({ id: Id }))
    .output(z.object({ ok: z.literal(true) }));

/** Nested contract object mounted at `contract.device`. */
export const deviceContract = {
    create: deviceCreate,
    list: deviceList,
    kinds: deviceKinds,
    update: deviceUpdate,
    delete: deviceDelete,
};
