import type { EntityManager } from '@mikro-orm/postgresql';

import { Seeder } from '@mikro-orm/seeder';

import { GivingOrganization } from '../../../../modules/backoffice/product/money/catalog/giving-organization/giving-organization.entity';
import { GIVING_ORGANIZATION_SEED } from '../../../../modules/backoffice/product/money/catalog/giving-organization/seed/giving-organization.seed-data';

/** Seeds backoffice.reference_money_giving_organization — safe to re-run. */
export class GivingOrganizationSeeder extends Seeder {
    async run(em: EntityManager): Promise<void> {
        const keys = GIVING_ORGANIZATION_SEED.map(row => row.key);
        const seedKeys = new Set(keys);
        const existingRows = await em.find(GivingOrganization, {});
        const existingByKey = new Map(existingRows.map(row => [row.key, row]));
        for (const [sortOrder, row] of GIVING_ORGANIZATION_SEED.entries()) {
            const existing = existingByKey.get(row.key);
            if (existing) {
                existing.name = row.name;
                existing.description = row.description;
                existing.causes = [...row.causes];
                existing.country = row.country;
                existing.scope = row.scope;
                existing.website = row.website;
                existing.signals = row.signals.map(signal => ({ ...signal }));
                existing.reporting = row.reporting;
                existing.sortOrder = sortOrder;
                existing.isActive = true;
                continue;
            }
            em.create(GivingOrganization, {
                key: row.key,
                name: row.name,
                description: row.description,
                causes: [...row.causes],
                country: row.country,
                scope: row.scope,
                website: row.website,
                signals: row.signals.map(signal => ({ ...signal })),
                reporting: row.reporting,
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
