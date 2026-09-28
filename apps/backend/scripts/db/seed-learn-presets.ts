/**
 * Upsert Learn watch + book presets only (faster than full DatabaseSeeder).
 * Usage: pnpm exec tsx scripts/db/seed-learn-presets.ts
 */
import { MikroORM } from '@mikro-orm/postgresql';

import config from '../../mikro-orm.config';
import { BookPresetSeeder } from '../../src/database/seeders/product/growth/BookPresetSeeder';
import { WatchPresetSeeder } from '../../src/database/seeders/product/growth/WatchPresetSeeder';

async function main() {
    const orm = await MikroORM.init(config);
    try {
        await orm.seeder.seed(WatchPresetSeeder);
        await orm.seeder.seed(BookPresetSeeder);
        console.log('Watch + Book presets seeded.');
    } finally {
        await orm.close(true);
    }
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
