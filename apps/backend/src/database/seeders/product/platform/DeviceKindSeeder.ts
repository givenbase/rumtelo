import type { EntityManager } from '@mikro-orm/postgresql';

import { Seeder } from '@mikro-orm/seeder';

import { DeviceKindCatalog } from '../../../../modules/backoffice/reference/device-kind/device-kind.entity';
import { DEVICE_KIND_SEED } from '../../../../modules/backoffice/reference/device-kind/seed/device-kind.seed-data';

/** Seeds backoffice.reference_platform_device_kind — safe to re-run. */
export class DeviceKindSeeder extends Seeder {
    async run(em: EntityManager): Promise<void> {
        const keys = DEVICE_KIND_SEED.map(row => row.key);
        const seedKeys = new Set<string>(keys);
        const existingRows = await em.find(DeviceKindCatalog, {});
        const existingByKey = new Map(existingRows.map(row => [row.key, row]));
        for (const [sortOrder, row] of DEVICE_KIND_SEED.entries()) {
            const existing = existingByKey.get(row.key);
            if (existing) {
                existing.name = row.name;
                existing.icon = row.icon;
                existing.defaultConnection = row.defaultConnection;
                existing.defaultCapabilities = [...row.defaultCapabilities];
                existing.sortOrder = sortOrder;
                existing.isActive = true;
                continue;
            }
            em.create(DeviceKindCatalog, {
                key: row.key,
                name: row.name,
                icon: row.icon,
                defaultConnection: row.defaultConnection,
                defaultCapabilities: [...row.defaultCapabilities],
                sortOrder,
                isActive: true,
            } as never);
        }
        for (const row of existingRows) {
            if (!seedKeys.has(row.key)) row.isActive = false;
        }
        await em.flush();
    }
}
