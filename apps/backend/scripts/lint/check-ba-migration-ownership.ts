/**
 * Fail when Mikro migrations ALTER Better Auth-owned tables.
 *
 * BA library tables are mirrored under auth managed/ folders and migrated with
 * `pn auth:migrate`. This lint catches Mikro migrations that ALTER those tables
 * (including additionalFields) — strip that SQL after db:gen; keep snapshot.
 *
 * @see apps/backend/mikro-orm.config.ts
 * @see docs/engineering/household-taxonomy.md
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BACKEND_ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
const MIGRATIONS_DIR = join(BACKEND_ROOT, 'src/database/migrations');

/** Tables Better Auth creates/alters — must not appear in post-initial Mikro migrations. */
const BA_OWNED_TABLES = [
    'user',
    'session',
    'provider',
    'verification',
    'two_factor',
    'household',
    'member',
    'invitation',
] as const;

const BA_TABLE_PATTERN = BA_OWNED_TABLES.join('|');

/** create / alter / drop table|index targeting auth.<ba-table> */
const FORBIDDEN = new RegExp(
    String.raw`(?:alter\s+table|create\s+table|drop\s+table|create\s+index|drop\s+index)\s+(?:if\s+(?:not\s+)?exists\s+)?(?:"auth"\.)?"(?:${BA_TABLE_PATTERN})"`,
    'i'
);

/** Initial bootstrap is allowed to CREATE the BA mirrors once. */
function isGrandfathered(fileName: string): boolean {
    return fileName.includes('InitialSchema');
}

function main(): void {
    const files = readdirSync(MIGRATIONS_DIR)
        .filter(name => /^Migration\d+.*\.ts$/.test(name))
        .sort();

    const violations: string[] = [];

    for (const fileName of files) {
        if (isGrandfathered(fileName)) continue;
        const source = readFileSync(join(MIGRATIONS_DIR, fileName), 'utf8');
        // Strip line comments so explanatory notes do not false-positive.
        const code = source.replace(/\/\/.*$/gm, '');
        if (FORBIDDEN.test(code)) {
            violations.push(
                `${fileName}: touches Better Auth–owned auth.(${BA_OWNED_TABLES.join('|')}) — use pn auth:migrate`
            );
        }
    }

    if (violations.length > 0) {
        console.error('BA migration ownership violations:\n');
        for (const line of violations) console.error(`  • ${line}`);
        console.error(
            '\nSee docs/engineering/household-taxonomy.md — BA DDL via pn auth:migrate.\n'
        );
        process.exit(1);
    }

    console.log('BA migration ownership: ok');
}

main();
