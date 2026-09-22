/**
 * Rare migration squash + multi-env rebuild.
 *
 * Default (`pnpm db:reset`):
 *   1. Strict confirm — type RESET ALL ENVS
 *   2. Squash migration files once (delete + gen InitialSchema) against **development**
 *   3. Rebuild development DB
 *   4. Confirm + `db:fresh` staging (keep files; wipe + migrate)
 *   5. Confirm + `db:fresh` production
 *
 * Local only:
 *   pnpm db:reset -- --local
 *
 * Single-env wipe without touching migration files:
 *   pnpm db:fresh / db:fresh:stag / db:fresh:prod
 *
 * `--yes` / DB_DROP_CONFIRM never skips the phrase confirm for all-envs.
 * Optional CI escape hatch: DB_RESET_ALL_CONFIRM="RESET ALL ENVS"
 *
 * TS scripts run with `bun` (no global `--import tsx`, which breaks contracts build).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, unlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

import { parse as parseDotenv } from 'dotenv';

import { databaseNameFromUrl, maskDatabaseUrl } from './confirm-destructive';

const CONFIRM_PHRASE = 'RESET ALL ENVS';

const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const monorepoRoot = resolve(backendRoot, '../..');
const migrationsDir = join(backendRoot, 'src/database/migrations');

const wantSeed = !process.argv.includes('--no-seed');
const localOnly = process.argv.includes('--local');

type DbEnv = 'development' | 'staging' | 'production';

/** Env for child processes — never inject `--import tsx` (breaks contracts build). */
function envFor(nodeEnv: DbEnv): NodeJS.ProcessEnv {
    return {
        ...process.env,
        NODE_ENV: nodeEnv,
    };
}

function run(
    command: string,
    args: string[],
    label: string,
    env: NodeJS.ProcessEnv = process.env
): void {
    console.log(`\n→ ${label}`);
    const result = spawnSync(command, args, {
        cwd: backendRoot,
        stdio: 'inherit',
        env,
        shell: false,
    });
    if (result.status !== 0) {
        console.error(`Failed: ${label}`);
        process.exit(result.status ?? 1);
    }
}

function clearMigrationFiles(): void {
    if (!existsSync(migrationsDir)) {
        console.error(`Migrations dir missing: ${migrationsDir}`);
        process.exit(1);
    }

    const files = readdirSync(migrationsDir);
    let removed = 0;
    for (const file of files) {
        const path = join(migrationsDir, file);
        if (file.startsWith('Migration') && file.endsWith('.ts')) {
            unlinkSync(path);
            removed++;
            console.log(`Removed ${file}`);
        }
        if (file.startsWith('.snapshot-') && file.endsWith('.json')) {
            unlinkSync(path);
            removed++;
            console.log(`Removed ${file}`);
        }
    }
    if (removed === 0) console.log('No migration/snapshot files to remove');
}

/** Read DATABASE_URL for an env without mutating process.env. */
function databaseUrlFor(nodeEnv: DbEnv): string | undefined {
    const files =
        nodeEnv === 'development'
            ? ['.env.development.local', '.env.development', '.env.local', '.env']
            : [`.env.${nodeEnv}.local`, `.env.${nodeEnv}`];

    for (const file of files) {
        for (const base of [monorepoRoot, backendRoot]) {
            const path = join(base, file);
            if (!existsSync(path)) continue;
            const parsed = parseDotenv(readFileSync(path));
            const url = parsed.DATABASE_URL;
            if (url) return url;
        }
    }
    return undefined;
}

async function ask(question: string): Promise<string> {
    if (!process.stdin.isTTY) {
        throw new Error('Interactive confirmation required (no TTY)');
    }
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    try {
        return await new Promise<string>(resolve => {
            rl.question(question, resolve);
        });
    } finally {
        rl.close();
    }
}

async function confirmPhrase(): Promise<boolean> {
    if (process.env.DB_RESET_ALL_CONFIRM === CONFIRM_PHRASE) {
        console.warn(`⚠️  Proceeding via DB_RESET_ALL_CONFIRM=${CONFIRM_PHRASE}`);
        return true;
    }

    console.warn('');
    console.warn('⚠️  RARE / DESTRUCTIVE — migration squash + wipe DBs');
    console.warn('   1. Delete Migration*.ts + snapshot (repo)');
    console.warn('   2. Generate one InitialSchema against development');
    console.warn('   3. Rebuild development DB');
    if (!localOnly) {
        console.warn('   4. db:fresh staging (wipe + apply same migrations)');
        console.warn('   5. db:fresh production (wipe + apply same migrations)');
    }
    console.warn('');
    console.warn('   --yes does NOT skip this. Commit the new migration after.');
    console.warn('');

    try {
        const answer = await ask(`Type "${CONFIRM_PHRASE}" to continue: `);
        return answer.trim() === CONFIRM_PHRASE;
    } catch {
        console.error('❌ Refusing without interactive confirmation.');
        console.error(`   Or set DB_RESET_ALL_CONFIRM="${CONFIRM_PHRASE}" for CI.`);
        return false;
    }
}

async function confirmEnvFresh(nodeEnv: 'staging' | 'production'): Promise<boolean> {
    const url = databaseUrlFor(nodeEnv);
    if (!url) {
        console.warn(
            `\n⏭️  Skip ${nodeEnv}: no .env.${nodeEnv} (run pnpm env:use:${nodeEnv} first)`
        );
        return false;
    }

    const dbName = databaseNameFromUrl(url);
    const host = new URL(url).host;

    console.warn('');
    console.warn(`⚠️  Next: wipe ${nodeEnv} DB and apply migrations (files unchanged)`);
    console.warn(`   Database: ${dbName}`);
    console.warn(`   Host:     ${host}`);
    console.warn(`   URL:      ${maskDatabaseUrl(url)}`);
    console.warn('');

    if (process.env.DB_RESET_ALL_CONFIRM === CONFIRM_PHRASE) {
        return true;
    }

    try {
        const answer = await ask(`Type the ${nodeEnv} database name "${dbName}" to confirm: `);
        return answer.trim() === dbName;
    } catch {
        console.error(`❌ Skipping ${nodeEnv} — confirmation failed`);
        return false;
    }
}

function squashAndRebuildDev(): void {
    console.log('\n══ development: squash migrations + rebuild ══');
    clearMigrationFiles();

    const env = envFor('development');

    run('bun', ['scripts/db/drop-schema-cascade.ts', '--yes'], 'dev: drop schemas', env);

    // MikroORM CLI still via pnpm; clean env (no --import tsx).
    run(
        'pnpm',
        [
            'exec',
            'mikro-orm',
            'migration:create',
            '--initial',
            '--name',
            'InitialSchema',
            '--config',
            './mikro-orm.config.ts',
        ],
        'dev: gen initial migration',
        {
            ...env,
            NODE_OPTIONS: [process.env.NODE_OPTIONS, '--import tsx'].filter(Boolean).join(' '),
        }
    );

    run('bun', ['scripts/db/migration-up.ts'], 'dev: migration:up', env);

    run('bun', ['src/modules/auth/engine/auth.migrate.ts'], 'dev: auth:migrate', env);

    if (wantSeed) {
        run('pnpm', ['--filter', '@rumtelo/contracts', 'build'], 'dev: build contracts', env);
        run('bun', ['scripts/db/seeder-run.ts'], 'dev: seed', env);
    }
}

function freshEnv(nodeEnv: 'staging' | 'production'): void {
    console.log(`\n══ ${nodeEnv}: fresh (wipe DB, keep migration files) ══`);
    const env = envFor(nodeEnv);
    run('pnpm', ['run', 'db:fresh'], `${nodeEnv}: db:fresh`, env);
}

async function main(): Promise<void> {
    if (!(await confirmPhrase())) {
        console.log('Aborted — no changes made.');
        process.exit(0);
    }

    squashAndRebuildDev();
    console.log('\n✅ Development squash + rebuild finished.\n');

    if (localOnly) {
        console.log('✨ db:reset --local complete (dev only). Commit the new migration.');
        process.exit(0);
    }

    if (await confirmEnvFresh('staging')) {
        freshEnv('staging');
    }

    if (await confirmEnvFresh('production')) {
        freshEnv('production');
    }

    console.log('\n✨ db:reset complete');
    console.log('   Commit apps/backend/src/database/migrations/ when ready.');
    process.exit(0);
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
