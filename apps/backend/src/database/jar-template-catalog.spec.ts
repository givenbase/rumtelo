import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
    DEFAULT_GROUP_SPLIT,
    JAR_CAPABILITIES,
    JAR_MAIN_KEY_BY_GROUP,
    JarKey,
    OPTIONAL_JAR_SHARE,
    jarGroupFor,
    isMainJarKey,
} from '@rumtelo/contracts';

import { JarTemplate } from '../modules/backoffice/product/money/template/jar/jar.entity';
import { JAR_TEMPLATE_TRANSLATIONS } from '../modules/backoffice/product/money/template/jar/seed/jar-translations';
import { JAR_TEMPLATE_SEED } from '../modules/backoffice/product/money/template/jar/seed/jar.seed-data';
import { Migration20261123100000_JarKeyDailyGoals } from './migrations/Migration20261123100000_JarKeyDailyGoals';
import { Migration20261123100100_JarTemplateMainPots } from './migrations/Migration20261123100100_JarTemplateMainPots';

/**
 * Static guard for the hand-written Rumtelo Pots migrations (no database exists to run them):
 * the snapshot, the entity, the seed data and the SQL must tell the same story. This does NOT
 * replace running the migrations on staging.
 */

type SnapshotColumn = {
    name: string;
    type: string;
    nullable: boolean;
    default: string | null;
    autoincrement: boolean;
    enumItems?: string[];
    nativeEnumName?: string;
};
type SnapshotTable = { name: string; schema?: string; columns: Record<string, SnapshotColumn> };
type Snapshot = { tables: SnapshotTable[]; nativeEnums: Record<string, { items: string[] }> };

const snapshot = JSON.parse(
    readFileSync(join(__dirname, 'migrations', '.snapshot-railway.json'), 'utf8')
) as Snapshot;
const tableOf = (name: string) => snapshot.tables.find(table => table.name === name)!;

/** Run a migration's `up` / `down` against a recorder instead of a database. */
function statementsOf(migration: { prototype: object }, method: 'up' | 'down'): string[] {
    const sql: string[] = [];
    const instance = Object.create(migration.prototype) as {
        addSql: (query: string) => void;
        up: () => void;
        down: () => void;
    };
    instance.addSql = query => {
        sql.push(query);
    };
    instance[method]();
    return sql;
}

const upSql = statementsOf(Migration20261123100100_JarTemplateMainPots, 'up');
const downSql = statementsOf(Migration20261123100100_JarTemplateMainPots, 'down');
const squash = (text: string) => text.replace(/\s+/g, ' ').trim();

describe('snapshot and entity agree on the jar key enum', () => {
    const ALL_KEYS = Object.values(JarKey);

    it('lists every JarKey in the native enum and in every column that uses it', () => {
        expect(snapshot.nativeEnums['money_jar_key']!.items).toEqual(ALL_KEYS);
        const columns = snapshot.tables.flatMap(table =>
            Object.values(table.columns)
                .filter(column => column.nativeEnumName === 'money_jar_key')
                .map(column => ({ table: table.name, column }))
        );
        // public.money_jar.key, jar template key, transaction-in preset jar_key.
        expect(columns.map(entry => entry.table).sort()).toEqual([
            'money_jar',
            'reference_money_jar_template',
            'reference_money_transaction_in_preset',
        ]);
        for (const entry of columns) expect(entry.column.enumItems).toEqual(ALL_KEYS);
    });

    it('adds exactly the two new values, outside a transaction, and is safe to run twice', () => {
        const migration = Object.create(Migration20261123100000_JarKeyDailyGoals.prototype) as {
            isTransactional: () => boolean;
            up: () => void;
            addSql: (query: string) => void;
        };
        const sql: string[] = [];
        migration.addSql = query => {
            sql.push(query);
        };
        migration.up();
        expect(migration.isTransactional()).toBe(false);
        expect(sql.map(squash)).toEqual([
            `alter type "money_jar_key" add value if not exists 'DAILY';`,
            `alter type "money_jar_key" add value if not exists 'GOALS';`,
        ]);
        expect(ALL_KEYS).toContain('DAILY');
        expect(ALL_KEYS).toContain('GOALS');
    });
});

describe('is_default column', () => {
    it('is boolean, not null, default false in the snapshot, like the entity', () => {
        const column = tableOf('reference_money_jar_template').columns['is_default']!;
        expect(column).toMatchObject({ type: 'boolean', nullable: false, default: 'false' });
        expect(new JarTemplate().isDefault).toBe(false);
    });

    it('is added with the same shape and dropped again by down', () => {
        expect(squash(upSql[0]!)).toBe(
            'alter table "backoffice"."reference_money_jar_template" add column "is_default" boolean not null default false;'
        );
        expect(downSql.map(squash).at(-1)).toBe(
            'alter table "backoffice"."reference_money_jar_template" drop column "is_default";'
        );
    });
});

describe('insert column lists carry every required column', () => {
    /** Columns a plain INSERT must name: not null, no default, not a serial. */
    const required = (tableName: string) =>
        Object.values(tableOf(tableName).columns)
            .filter(column => !column.nullable && column.default === null && !column.autoincrement)
            .map(column => column.name);

    const columnListOf = (table: string) => {
        const statement = upSql.map(squash).find(sql => sql.startsWith(`insert into ${table}`));
        expect(statement, `insert into ${table}`).toBeDefined();
        const list = /^insert into \S+ \(([^)]*)\)/.exec(statement!)![1]!;
        return list.split(',').map(name => name.trim().replaceAll('"', ''));
    };

    it('jar template rows', () => {
        const named = columnListOf('"backoffice"."reference_money_jar_template"');
        for (const name of required('reference_money_jar_template')) expect(named).toContain(name);
        // Every named column exists on the table.
        for (const name of named) {
            expect(tableOf('reference_money_jar_template').columns[name]).toBeDefined();
        }
    });

    it('translation rows', () => {
        const named = columnListOf('"backoffice"."reference_translation"');
        for (const name of required('reference_translation')) expect(named).toContain(name);
    });

    it('category link rows (the serial id fills itself)', () => {
        const named = columnListOf('"backoffice"."reference_money_category_template_jar_template"');
        for (const name of required('reference_money_category_template_jar_template')) {
            expect(named).toContain(name);
        }
    });

    it('never touches a better-auth table or schema', () => {
        const all = [...upSql, ...downSql].join(' ');
        expect(all).not.toMatch(/"auth"\./);
        expect(all).not.toMatch(
            /"(user|session|account|organization|member|invitation|verification)"/
        );
    });
});

describe('seed data, snapshot-time SQL and contracts say the same thing', () => {
    const seedByKey = new Map(JAR_TEMPLATE_SEED.map(row => [row.key, row]));

    it('has one template per JarKey, main pots flagged default, group order = sortOrder', () => {
        expect(JAR_TEMPLATE_SEED.map(row => row.key).sort()).toEqual(Object.values(JarKey).sort());
        expect(
            JAR_TEMPLATE_SEED.filter(row => row.isDefault)
                .map(row => row.key)
                .sort()
        ).toEqual(Object.values(JAR_MAIN_KEY_BY_GROUP).sort());
        for (const row of JAR_TEMPLATE_SEED) expect(row.isDefault).toBe(isMainJarKey(row.key));
    });

    it('the default templates add up to exactly 100.00', () => {
        const basisPoints = JAR_TEMPLATE_SEED.filter(row => row.isDefault).reduce(
            (total, row) => total + Math.round(Number(row.percentage) * 100),
            0
        );
        expect(basisPoints).toBe(10_000);
        for (const row of JAR_TEMPLATE_SEED.filter(candidate => candidate.isDefault)) {
            expect(Number(row.percentage)).toBe(DEFAULT_GROUP_SPLIT[jarGroupFor(row.key)]);
        }
    });

    it('every optional share is smaller than its group main pot, even with all of its group on', () => {
        for (const group of Object.keys(DEFAULT_GROUP_SPLIT)) {
            const optional = JAR_TEMPLATE_SEED.filter(
                row => !row.isDefault && jarGroupFor(row.key) === group
            );
            const taken = optional.reduce(
                (total, row) => total + Math.round(Number(row.percentage) * 100),
                0
            );
            const groupBasisPoints =
                DEFAULT_GROUP_SPLIT[group as keyof typeof DEFAULT_GROUP_SPLIT] * 100;
            expect(taken).toBeLessThan(groupBasisPoints);
        }
        for (const row of JAR_TEMPLATE_SEED.filter(candidate => !candidate.isDefault)) {
            expect(Number(row.percentage)).toBe(
                OPTIONAL_JAR_SHARE[row.key as keyof typeof OPTIONAL_JAR_SHARE]
            );
        }
    });

    it('capabilities in the seed mirror the contracts', () => {
        for (const row of JAR_TEMPLATE_SEED) {
            expect(row.capabilities).toEqual(JAR_CAPABILITIES[row.key]);
        }
    });

    it('the migration update rows match the seed (default flag, share, sort order)', () => {
        const update = squash(upSql[1]!);
        const rows = [...update.matchAll(/\('([A-Z_]+)', (true|false), ([\d.]+), (\d+)\)/g)];
        expect(rows).toHaveLength(6);
        const fromSql = rows.map(([, key, isDefault, percentage, sortOrder]) => [
            key,
            isDefault === 'true',
            Number(percentage),
            Number(sortOrder),
        ]);
        const fromSeed = rows.map(([, key]) => {
            const seed = seedByKey.get(key as JarKey)!;
            return [key, seed.isDefault, Number(seed.percentage), JAR_TEMPLATE_SEED.indexOf(seed)];
        });
        expect(fromSql).toEqual(fromSeed);
    });

    it.each([JarKey.DAILY, JarKey.GOALS])(
        'the migration inserts the %s template exactly as the seed has it',
        key => {
            const seed = seedByKey.get(key)!;
            const insert = upSql.find(sql =>
                sql.includes('insert into "backoffice"."reference_money_jar_template"')
            )!;
            // One chunk per VALUES row, so a lazy match can never run from one row into the next.
            const rowText = insert
                .split('gen_random_uuid()')
                .slice(1)
                .find(chunk => new RegExp(`'${key}'\\s*\\)`).test(chunk));
            const block = rowText
                ? new RegExp(
                      `^, now\\(\\), now\\(\\),\\s*'([^']*)', '([^']*)', '([^']*)', ([\\d.]+), (\\d+),\\s*'(.*?)'::jsonb,\\s*'(.*?)'::jsonb,\\s*(true|false), (true|false), '${key}'`,
                      's'
                  ).exec(rowText)
                : null;
            expect(block, `row for ${key}`).not.toBeNull();
            const [
                ,
                name,
                subtitle,
                icon,
                percentage,
                sortOrder,
                guide,
                capabilities,
                isActive,
                isDefault,
            ] = block!;
            expect(name).toBe(seed.name);
            expect(subtitle).toBe(seed.subtitle);
            expect(icon).toBe(seed.icon);
            expect(Number(percentage)).toBe(Number(seed.percentage));
            expect(Number(sortOrder)).toBe(JAR_TEMPLATE_SEED.indexOf(seed));
            expect(JSON.parse(guide!)).toEqual(seed.guide);
            expect(JSON.parse(capabilities!)).toEqual(seed.capabilities);
            expect(isActive).toBe('true');
            expect(isDefault === 'true').toBe(seed.isDefault);
        }
    );

    it('the migration translations match jar-translations.ts for DAILY and GOALS', () => {
        const statement = squash(upSql.find(sql => sql.includes('reference_translation'))!);
        const rows = [
            ...statement.matchAll(
                /\('(DAILY|GOALS)', '(name|subtitle)', '(nl|es|fr)', '([^']*)'\)/g
            ),
        ];
        expect(rows).toHaveLength(12);
        for (const [, key, field, locale, text] of rows) {
            const copy = JAR_TEMPLATE_TRANSLATIONS[locale as 'nl' | 'es' | 'fr']![key as JarKey]!;
            expect(text, `${locale} ${key} ${field}`).toBe(copy[field as 'name' | 'subtitle']);
        }
    });

    it('down restores the six original shares and sort orders, and is idempotent in shape', () => {
        const restore = squash(downSql.find(sql => sql.includes('set "percentage"'))!);
        const rows = [...restore.matchAll(/\('([A-Z_]+)', ([\d.]+), (\d+)\)/g)];
        expect(
            rows.map(([, key, percentage, sortOrder]) => [
                key,
                Number(percentage),
                Number(sortOrder),
            ])
        ).toEqual([
            ['NECESSITIES', 55, 0],
            ['FINANCIAL_FREEDOM', 10, 1],
            ['LONG_TERM_SAVINGS', 10, 2],
            ['EDUCATION', 10, 3],
            ['PLAY', 10, 4],
            ['GIVE', 5, 5],
        ]);
        expect(rows.reduce((total, [, , percentage]) => total + Number(percentage), 0)).toBe(100);
    });
});
