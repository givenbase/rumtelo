import { Migrator } from '@mikro-orm/migrations';
import { defineConfig } from '@mikro-orm/postgresql';
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';
import { SeedManager } from '@mikro-orm/seeder';

import { loadEnvFiles } from './src/common/config/load-env';

/** MikroORM CLI runs outside Nest — same load path as runtime (no override). */
loadEnvFiles();

const isProd = process.env.NODE_ENV === 'production';

/**
 * Energy / Soul concept schemas stay in the repo but must not hit Postgres until
 * redesigned. `afterDiscovered` strips them even when Nest/decorator imports
 * (coach, seeders) still register the classes.
 */
const excludedEntityPathPatterns = [
    '/modules/public/product/energy/',
    '/modules/public/product/soul/',
];

export default defineConfig({
    // Source entities — tsx / Nest load .ts; TsMorph reads these paths for metadata.
    entities: ['./src/**/*.entity.ts'],
    entitiesTs: ['./src/**/*.entity.ts'],
    clientUrl: process.env.DATABASE_URL,
    // v7: driverOptions go straight to pg.Pool (no knex `connection` nesting).
    driverOptions:
        process.env.DATABASE_SSL === 'true' ? { ssl: { rejectUnauthorized: false } } : {},
    // Planes: auth, public (app/household), backoffice.
    // Product areas are folders under modules/public — not separate DB schemas.
    schema: 'public',
    // TsMorph: tsx does not emit design:type Reflect metadata.
    metadataProvider: TsMorphMetadataProvider,
    metadataCache: { enabled: true, options: { cacheDir: 'temp' } },
    discovery: {
        warnWhenNoEntities: true,
        afterDiscovered(storage) {
            // v7: getAll() is a Map keyed by entity name / class; reset() takes that key.
            for (const [entityName, metadata] of storage.getAll()) {
                if (
                    metadata.path &&
                    excludedEntityPathPatterns.some(pattern => metadata.path.includes(pattern))
                ) {
                    console.log(`Excluding entity: ${metadata.className} from ${metadata.path}`);
                    storage.reset(entityName);
                }
            }
        },
    },
    extensions: [Migrator, SeedManager],
    // Never auto-sync a schema that holds money. Migrations only.
    migrations: {
        path: './src/database/migrations',
        pathTs: './src/database/migrations',
        snapshot: true,
    },
    seeder: {
        path: './src/database/seeders',
        pathTs: './src/database/seeders',
        defaultSeeder: 'DatabaseSeeder',
    },
    debug: !isProd,
    forceUtcTimezone: true,
});
