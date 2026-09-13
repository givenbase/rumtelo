import type { EntityManager } from '@mikro-orm/postgresql';

import { Seeder } from '@mikro-orm/seeder';

import { GivingOrganisation } from '../../../../modules/backoffice/product/money/catalog/giving-organisation/giving-organisation.entity';
import { GIVING_ORGANISATION_SEED } from '../../../../modules/backoffice/product/money/catalog/giving-organisation/seed/giving-organisation.seed-data';

/** Seeds backoffice.reference_money_giving_organisation — safe to re-run. */
export class GivingOrganisationSeeder extends Seeder {
    async run(em: EntityManager): Promise<void> {
        const keys = GIVING_ORGANISATION_SEED.map(row => row.key);
        const existingRows = await em.find(GivingOrganisation, { key: { $in: keys } });
        const existingByKey = new Map(existingRows.map(row => [row.key, row]));
        for (const [sortOrder, row] of GIVING_ORGANISATION_SEED.entries()) {
            const existing = existingByKey.get(row.key);
            if (existing) {
                existing.name = row.name;
                existing.summary = row.summary;
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
            em.create(GivingOrganisation, {
                key: row.key,
                name: row.name,
                summary: row.summary,
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
        await em.flush();
    }
}
