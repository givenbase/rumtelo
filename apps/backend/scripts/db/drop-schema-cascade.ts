/**
 * Drops all application schemas and resets public using a single DB connection.
 * Avoids MikroORM/Knex pool timeouts during schema:drop on cloud Postgres.
 *
 * Usage (from apps/backend):
 *   pnpm db:drop
 *   pnpm schema:drop:cascade
 *   tsx scripts/db/drop-schema-cascade.ts
 *
 * Non-interactive / scripted: pass --yes or DB_DROP_CONFIRM=yes
 */
import { Pool } from 'pg';

import { loadEnvFiles } from '../../src/common/config/load-env';
import { confirmDestructiveDrop } from './confirm-destructive';

const APP_SCHEMAS = ['auth', 'backoffice'] as const;

/** Pre-plane schemas — tables now live in `public`. Always drop on reset. */
const LEGACY_SCHEMAS = ['money', 'energy', 'growth', 'soul', 'platform'] as const;

loadEnvFiles();

async function main(): Promise<void> {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error('❌ DATABASE_URL is not set');
        process.exit(1);
    }

    const targets = [...APP_SCHEMAS, ...LEGACY_SCHEMAS, 'public'];
    const confirmed = await confirmDestructiveDrop({
        action: 'Drop all application schemas and reset public',
        target: targets.join(', '),
        databaseUrl: connectionString,
    });

    if (!confirmed) {
        console.log('Aborted — no changes made.');
        process.exit(0);
    }

    const pool = new Pool({
        connectionString,
        ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
        max: 1,
    });

    const client = await pool.connect();
    try {
        console.log('🗑️  Dropping application schemas (CASCADE)...\n');

        for (const schema of [...APP_SCHEMAS, ...LEGACY_SCHEMAS]) {
            await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
            console.log(`✅ Dropped schema "${schema}"`);
        }

        await client.query('DROP SCHEMA IF EXISTS public CASCADE');
        await client.query('CREATE SCHEMA public');
        await client.query('GRANT ALL ON SCHEMA public TO public');
        await client.query('GRANT ALL ON SCHEMA public TO CURRENT_USER');
        console.log('✅ Reset public schema');

        await client.query('DROP TABLE IF EXISTS public.mikro_orm_migrations CASCADE');
        console.log('✅ Dropped mikro_orm_migrations (if present)');

        console.log('\n✨ Schema drop complete');
    } catch (error) {
        console.error('❌ Schema drop failed:', error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
