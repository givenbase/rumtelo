/**
 * Squash local migration history and rebuild the DB from entities:
 *   1. delete Migration*.ts + snapshot
 *   2. drop schemas (auth / backoffice / public)
 *   3. db:gen  → migration:create --initial
 *   4. db:push → migration:up
 *   5. auth:migrate
 *   6. seed (skip with --no-seed)
 *
 * Usage:
 *   pnpm db:reset
 *   pnpm db:reset -- --no-seed
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, unlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const migrationsDir = join(backendRoot, 'src/database/migrations');

const ormEnv = {
    ...process.env,
    NODE_OPTIONS: [process.env.NODE_OPTIONS, '--import tsx'].filter(Boolean).join(' '),
};

function run(command: string, args: string[], label: string, env = process.env): void {
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

function main(): void {
    if (process.env.NODE_ENV === 'production' && !process.argv.includes('--yes')) {
        console.error('Refusing db:reset in production without --yes');
        process.exit(1);
    }

    const wantSeed = !process.argv.includes('--no-seed');

    console.log('db:reset — squash migrations → gen initial → push');
    clearMigrationFiles();

    run('pnpm', ['exec', 'tsx', 'scripts/db/drop-schema-cascade.ts', '--yes'], 'db:drop schemas');

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
        'db:gen (initial migration)',
        ormEnv
    );

    run(
        'pnpm',
        ['exec', 'mikro-orm', 'migration:up', '--config', './mikro-orm.config.ts'],
        'db:push (migration:up)',
        ormEnv
    );

    run('pnpm', ['run', 'auth:migrate'], 'auth:migrate');

    if (wantSeed) {
        run(
            'pnpm',
            ['exec', 'mikro-orm', 'seeder:run', '--config', './mikro-orm.config.ts'],
            'db:seed',
            ormEnv
        );
    }

    console.log('\n✨ db:reset complete');
}

main();
