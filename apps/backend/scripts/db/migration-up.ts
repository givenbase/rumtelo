/**
 * Apply pending MikroORM migrations without the `@mikro-orm/cli` binary.
 * Prefer the ORM API so CI/local stay on `tsx` (same as `pnpm start`).
 *
 * Usage: pnpm db:push  →  tsx scripts/db/migration-up.ts
 */
import { MikroORM } from '@mikro-orm/postgresql';

import config from '../../mikro-orm.config';

/** GitHub Actions / any host outside Railway cannot resolve private mesh DNS. */
function assertPublicDatabaseUrl(url: string | undefined): void {
    if (!url) {
        throw new Error('DATABASE_URL is not set.');
    }
    if (/\.railway\.internal(?::|\/|$)/i.test(url)) {
        throw new Error(
            'DATABASE_URL points at *.railway.internal — that host only works inside Railway.\n' +
                'For GitHub Actions, use the Postgres public TCP URL from Railway\n' +
                '(Postgres service → Connect → Public Network / TCP Proxy), then:\n' +
                '  update .env.github.secrets.{staging|production}\n' +
                '  pnpm sync:github-secrets'
        );
    }
}

async function main() {
    assertPublicDatabaseUrl(process.env.DATABASE_URL);

    const orm = await MikroORM.init(config);
    try {
        const migrator = orm.migrator;
        const pending = await migrator.getPendingMigrations();
        if (pending.length === 0) {
            console.log('No pending migrations.');
            return;
        }
        console.log(`Applying ${pending.length} migration(s)…`);
        const executed = await migrator.up();
        for (const m of executed) {
            console.log(`  ✓ ${m.name}`);
        }
        console.log(`Done. Applied ${executed.length} migration(s).`);
    } finally {
        await orm.close(true);
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
