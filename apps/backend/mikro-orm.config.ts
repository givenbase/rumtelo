import { Migrator } from '@mikro-orm/migrations';
import { defineConfig } from '@mikro-orm/postgresql';
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';
import { SeedManager } from '@mikro-orm/seeder';

import { loadEnvFiles } from './src/common/config/load-env';

/** MikroORM CLI runs outside Nest — same load path as runtime (no override). */
loadEnvFiles();

const isProd = process.env.NODE_ENV === 'production';

export default defineConfig({
    // Source entities — tsx / Nest load .ts; TsMorph reads these paths for metadata.
    entities: ['./src/**/*.entity.ts'],
    entitiesTs: ['./src/**/*.entity.ts'],
    clientUrl: process.env.DATABASE_URL,
    driverOptions:
        process.env.DATABASE_SSL === 'true'
            ? { connection: { ssl: { rejectUnauthorized: false } } }
            : {},
    // Planes: auth, public (app/household), backoffice.
    // Product areas are folders under modules/public — not separate DB schemas.
    schema: 'public',
    // TsMorph: tsx does not emit design:type Reflect metadata.
    metadataProvider: TsMorphMetadataProvider,
    metadataCache: { enabled: true, options: { cacheDir: 'temp' } },
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
