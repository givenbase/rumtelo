/**
 * Run MikroORM seeders without the `@mikro-orm/cli` binary.
 *
 * Usage: pnpm db:seed  →  tsx scripts/db/seeder-run.ts
 *
 * Each seeder flushes on its own (SeedManager). Heavy multi-step seeders
 * (e.g. CatalogTranslationSeeder) open their own `em.transactional` scopes.
 * Do not wrap the whole DatabaseSeeder in one transaction — DemoHouseholdSeeder
 * forks EntityManagers that would leave that outer tx.
 */
import { MikroORM } from '@mikro-orm/postgresql';

import config from '../../mikro-orm.config';
import { DatabaseSeeder } from '../../src/database/seeders/DatabaseSeeder';

function formatSeedError(error: unknown): string {
    if (error instanceof Error) {
        return error.stack ?? `${error.name}: ${error.message}`;
    }
    try {
        return JSON.stringify(error, null, 2);
    } catch {
        return String(error);
    }
}

async function main() {
    const orm = await MikroORM.init(config);
    let failed: unknown;
    try {
        await orm.seeder.seed(DatabaseSeeder);
        console.log('Seeder finished.');
    } catch (error: unknown) {
        failed = error;
        console.error('\nSeeder failed:\n');
        console.error(formatSeedError(error));
        console.error('');
    } finally {
        try {
            await orm.close(true);
        } catch (closeError: unknown) {
            console.error('ORM close failed after seed:\n');
            console.error(formatSeedError(closeError));
            failed ??= closeError;
        }
    }
    process.exit(failed ? 1 : 0);
}

main().catch(error => {
    // init() failures never reach the try/finally above
    console.error('\nSeeder aborted before run:\n');
    console.error(formatSeedError(error));
    console.error('');
    process.exit(1);
});
