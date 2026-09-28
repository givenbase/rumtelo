import { DeviceCapability, DeviceConnection } from '@rumtelo/contracts';
import { z } from 'zod';

import type { SettingsFormT } from './settings-form-zod';

export function createDeviceFormSchema(msg: SettingsFormT) {
    return z.object({
        name: z.string().trim().min(1, msg('pages.settings.panels.devices.name')).max(60),
        kindKey: z.string().trim().min(1, msg('pages.settings.panels.devices.kind')).max(64),
        connection: z.enum(DeviceConnection),
        capabilities: z.array(z.enum(DeviceCapability)).min(1),
        accountId: z.uuid().nullable(),
        vendor: z.string().trim().max(60),
        model: z.string().trim().max(60),
        externalId: z.string().trim().max(120),
    });
}

export type DeviceFormValues = z.infer<ReturnType<typeof createDeviceFormSchema>>;
