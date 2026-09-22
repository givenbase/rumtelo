/**
 * Drops all application schemas and resets public using a single DB connection.
 * Avoids MikroORM/Knex pool timeouts during schema:drop on cloud Postgres.
 * Terminates other sessions first so DROP SCHEMA does not hang on locks.
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
import { confirmDestructiveDrop, databaseNameFromUrl } from './confirm-destructive';

const APP_SCHEMAS = ['auth', 'backoffice'] as const;

/** Pre-plane schemas — tables now live in `public`. Always drop on reset. */
const LEGACY_SCHEMAS = ['money', 'energy', 'growth', 'soul', 'platform'] as const;

/** Fail fast if a lock survives terminate (instead of hanging forever). */
const LOCK_TIMEOUT_MS = 30_000;

loadEnvFiles();

async function main(): Promise<void> {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error('❌ DATABASE_URL is not set');
        process.exit(1);
    }

    const databaseName = databaseNameFromUrl(connectionString);
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
        connectionTimeoutMillis: 15_000,
    });

    const client = await pool.connect();
    try {
        console.log('🗑️  Dropping application schemas (CASCADE)...\n');

        const terminated = await client.query<{ pg_terminate_backend: boolean }>(
            `SELECT pg_terminate_backend(pid)
             FROM pg_stat_activity
             WHERE datname = $1 AND pid <> pg_backend_pid()`,
            [databaseName]
        );
        console.log(
            `✅ Terminated ${terminated.rowCount ?? 0} other connection(s) to "${databaseName}"`
        );

        await client.query(`SET lock_timeout = '${LOCK_TIMEOUT_MS}'`);

        for (const schema of [...APP_SCHEMAS, ...LEGACY_SCHEMAS]) {
            console.log(`… dropping schema "${schema}"`);
            await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
            console.log(`✅ Dropped schema "${schema}"`);
        }

        console.log('… resetting public schema');
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
        console.error(
            '\n💡 If this timed out on locks, stop the backend / Railway deploy using this DB, then retry.'
        );
        console.error('💡 To wipe the whole database instead: pnpm --filter @rumtelo/backend schema:drop:db');
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
