import type { EntityManager } from '@mikro-orm/postgresql';

import { Seeder } from '@mikro-orm/seeder';

import { Bank } from '../../../../modules/backoffice/product/money/catalog/bank/bank.entity';
import { BANK_SEED } from '../../../../modules/backoffice/product/money/catalog/bank/seed/bank.seed-data';

export class BankSeeder extends Seeder {
    async run(em: EntityManager): Promise<void> {
        const keys = BANK_SEED.map(row => row.key);
        const seedKeys = new Set<string>(keys);
        const existingRows = await em.find(Bank, {}, { populate: ['partnerBanks'] });
        const existingByKey = new Map(existingRows.map(row => [row.key, row]));
        for (const [sortOrder, row] of BANK_SEED.entries()) {
            const existing = existingByKey.get(row.key);
            if (existing) {
                existing.name = row.name;
                existing.countries = [...row.countries];
                existing.ibanBankCode = row.ibanBankCode;
                existing.logoDomain = row.logoDomain;
                existing.website = row.website;
                existing.sortOrder = sortOrder;
                existing.isActive = true;
                continue;
            }
            em.create(Bank, {
                key: row.key,
                name: row.name,
                countries: [...row.countries],
                ibanBankCode: row.ibanBankCode,
                logoDomain: row.logoDomain,
                website: row.website,
                sortOrder,
                isActive: true,
            } as never);
        }
        for (const row of existingRows) {
            if (!seedKeys.has(row.key)) row.isActive = false;
        }
        await em.flush();

        // Partners need all banks persisted first (ICS → ING, ABN, …).
        const byKey = new Map(
            (await em.find(Bank, {}, { populate: ['partnerBanks'] })).map(row => [row.key, row])
        );
        for (const row of BANK_SEED) {
            const bank = byKey.get(row.key);
            if (!bank) continue;
            const partners: Bank[] = [];
            for (const key of row.partnerBankKeys) {
                const partner = byKey.get(key);
                if (partner) partners.push(partner);
            }
            bank.partnerBanks.set(partners);
        }
        await em.flush();
    }
}
