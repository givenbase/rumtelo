/**
 * One-shot: upsert FAMILY_SUPPORT preset (keeps HELPING_SOMEONE distinct).
 * Usage: pnpm exec tsx scripts/db/seed-family-support-preset.ts
 */
import { MikroORM } from '@mikro-orm/postgresql';

import config from '../../mikro-orm.config';
import { CatalogTranslationSeeder } from '../../src/database/seeders/product/money/CatalogTranslationSeeder';
import { FixedCostPresetSeeder } from '../../src/database/seeders/product/money/FixedCostPresetSeeder';

async function main() {
    const orm = await MikroORM.init(config);
    try {
        await orm.seeder.seed(FixedCostPresetSeeder);
        console.log('FixedCostPresetSeeder ok');
        await orm.seeder.seed(CatalogTranslationSeeder);
        console.log('CatalogTranslationSeeder ok');
    } finally {
        await orm.close(true);
    }
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
