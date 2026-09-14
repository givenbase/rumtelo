/**
 * Run MikroORM seeders without the `@mikro-orm/cli` binary.
 *
 * Usage: pnpm db:seed  →  tsx scripts/db/seeder-run.ts
 */
import { MikroORM } from '@mikro-orm/postgresql';

import config from '../../mikro-orm.config';
import { DatabaseSeeder } from '../../src/database/seeders/DatabaseSeeder';

async function main() {
    const orm = await MikroORM.init(config);
    try {
        await orm.seeder.seed(DatabaseSeeder);
        console.log('Seeder finished.');
    } finally {
        await orm.close(true);
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
