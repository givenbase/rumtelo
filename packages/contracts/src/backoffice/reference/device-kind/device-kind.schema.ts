/**
 * Device kind catalog — company-authored classes of hardware (wristband, ring, …).
 * Household devices store `kindKey` as a snapshot (not a FK).
 */

import { z } from 'zod';

import { CatalogItemBase } from '../../../common/common.schema';
import { DeviceCapability, DeviceConnection } from '../../../public/platform/enums';

/** Backoffice row: what kind of device can be registered. */
export const DeviceKindCatalogItem = CatalogItemBase.extend({
    /** Lucide / UI icon key for the pair dialog. */
    icon: z.string().min(1).max(40),
    defaultConnection: z.enum(DeviceConnection),
    defaultCapabilities: z.array(z.enum(DeviceCapability)).min(1),
});

export type DeviceKindCatalogItem = z.infer<typeof DeviceKindCatalogItem>;
