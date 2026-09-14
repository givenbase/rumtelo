/**
 * Drops and recreates the target database using a maintenance connection to `postgres`.
 * Terminates other sessions first so DROP DATABASE does not hang.
 *
 * Usage (from apps/backend):
 *   pnpm schema:drop:db
 *   tsx scripts/db/drop-database.ts
 *
 * Non-interactive / scripted: pass --yes or DB_DROP_CONFIRM=yes
 */
import { Pool } from 'pg';

import { loadEnvFiles } from '../../src/common/config/load-env';
import { confirmDestructiveDrop, databaseNameFromUrl } from './confirm-destructive';

loadEnvFiles();

function maintenanceConnectionString(connectionString: string): string {
    const url = new URL(connectionString);
    url.pathname = '/postgres';
    return url.toString();
}

async function main(): Promise<void> {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error('❌ DATABASE_URL is not set');
        process.exit(1);
    }

    const databaseName = databaseNameFromUrl(connectionString);
    const maintenanceUrl = maintenanceConnectionString(connectionString);

    const confirmed = await confirmDestructiveDrop({
        action: 'Drop and recreate the entire database',
        target: `database "${databaseName}"`,
        databaseUrl: connectionString,
    });

    if (!confirmed) {
        console.log('Aborted — no changes made.');
        process.exit(0);
    }

    console.log(`🗑️  Dropping database "${databaseName}"...\n`);

    const pool = new Pool({
        connectionString: maintenanceUrl,
        ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
        max: 1,
    });

    const client = await pool.connect();
    try {
        await client.query(
            `SELECT pg_terminate_backend(pid)
             FROM pg_stat_activity
             WHERE datname = $1 AND pid <> pg_backend_pid()`,
            [databaseName]
        );
        console.log(`✅ Terminated active connections to "${databaseName}"`);

        await client.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
        console.log(`✅ Dropped database "${databaseName}"`);

        await client.query(`CREATE DATABASE "${databaseName}"`);
        console.log(`✅ Created database "${databaseName}"`);
        console.log(
            '\n✨ Database drop complete — run pnpm db:create-schemas && pnpm db:push next'
        );
    } catch (error) {
        console.error('❌ Database drop failed:', error);
        console.error(
            '\n💡 If connections are still open, stop the backend dev server and close DB clients, then retry.'
        );
        console.error('💡 For a schema-only reset, use: pnpm schema:drop:cascade');
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
