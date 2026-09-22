import { getMigrations } from 'better-auth/db/migration';
import { Pool } from 'pg';

import { loadEnv } from '../../../common/config/env.config';
import { loadEnvFiles } from '../../../common/config/load-env';
import { createAuth } from './auth.config';

loadEnvFiles();

const env = loadEnv();

// better-auth's pool runs with search_path=auth; the schema must exist first.
const bootstrap = new Pool({
    connectionString: env.DATABASE_URL,
    ssl: env.DATABASE_SSL ? { rejectUnauthorized: false } : undefined,
});
await bootstrap.query('CREATE SCHEMA IF NOT EXISTS auth');
await bootstrap.end();

const auth = createAuth(env);
const { toBeCreated, toBeAdded, runMigrations } = await getMigrations(auth.options);

if (toBeCreated.length === 0 && toBeAdded.length === 0) {
    console.log('No better-auth migrations needed.');
    process.exit(0);
}

console.log(
    'Running better-auth migrations:',
    'create',
    toBeCreated.map(migration => migration.table),
    'alter',
    toBeAdded.map(migration => migration.table)
);

await runMigrations();
console.log('better-auth migrations completed.');
process.exit(0);
