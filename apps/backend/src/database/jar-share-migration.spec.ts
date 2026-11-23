import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { MetadataStorage } from '@mikro-orm/core';
import { describe, expect, it } from 'vitest';

import {
    JAR_SHARE_BASELINE_PERIOD,
    JarShare,
} from '../modules/public/product/money/plan/jar/jar-share.entity';
import { Migration20261123120000_JarShare } from './migrations/Migration20261123120000_JarShare';

/**
 * Static guard for the hand-written `money_jar_share` migration (no database exists to run it):
 * the entity decorators, the snapshot and the SQL must describe the same table. This does NOT
 * replace running the migration on staging.
 */

type SnapshotColumn = {
    name: string;
    type: string;
    nullable: boolean;
    primary: boolean;
    default: string | null;
    autoincrement: boolean;
    precision: number | null;
    scale: number | null;
    length: number | null;
};
type SnapshotTable = {
    name: string;
    schema?: string;
    columns: Record<string, SnapshotColumn>;
    indexes: { keyName: string; columnNames: string[]; unique: boolean; primary: boolean }[];
    checks: { name: string; columnName?: string }[];
    foreignKeys: Record<
        string,
        { columnNames: string[]; referencedTableName: string; deleteRule: string }
    >;
};
type DecoratorMeta = {
    className: string;
    tableName: string;
    schema: string;
    properties: Record<
        string,
        {
            kind: string;
            type?: string;
            length?: number;
            precision?: number;
            scale?: number;
            deleteRule?: string;
            nullable?: boolean;
        }
    >;
    checks: { name: string; expression: string }[];
    uniques: { properties: string[] }[];
};

const snapshot = JSON.parse(
    readFileSync(join(__dirname, 'migrations', '.snapshot-railway.json'), 'utf8')
) as { tables: SnapshotTable[] };
const table = snapshot.tables.find(candidate => candidate.name === 'money_jar_share')!;
const jarTable = snapshot.tables.find(candidate => candidate.name === 'money_jar')!;

// Importing the entity registers its decorator options; reading them keeps the entity the source.
void JarShare;
const entity = Object.values(MetadataStorage.getMetadata() as Record<string, DecoratorMeta>).find(
    meta => meta.className === 'JarShare'
)!;

/** Run a migration's `up` / `down` against a recorder instead of a database. */
function statementsOf(method: 'up' | 'down'): string[] {
    const sql: string[] = [];
    const instance = Object.create(Migration20261123120000_JarShare.prototype) as {
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

const squash = (text: string) => text.replace(/\s+/g, ' ').trim();
const upSql = statementsOf('up').map(squash);
const downSql = statementsOf('down').map(squash);
const PERIOD_FORMAT = /^[0-9]{4}-(0[1-9]|1[0-2])$/;

describe('entity and snapshot describe the same money_jar_share', () => {
    it('is a public money table on the household base', () => {
        expect(entity.tableName).toBe('money_jar_share');
        expect(entity.schema).toBe('public');
        expect(table.schema).toBe('public');
        expect(Object.keys(entity.properties).sort()).toEqual(['jar', 'percentage', 'period']);
    });

    it('has exactly the base columns plus period, percentage and jar_id', () => {
        expect(Object.keys(table.columns).sort()).toEqual([
            'created_at',
            'household_id',
            'id',
            'jar_id',
            'percentage',
            'period',
            'updated_at',
        ]);
        for (const column of Object.values(table.columns)) expect(column.nullable).toBe(false);
        expect(table.columns['id']!.primary).toBe(true);
    });

    it('stores period like the other YYYY-MM periods (varchar(7))', () => {
        expect(entity.properties['period']!.length).toBe(7);
        expect(table.columns['period']).toMatchObject({ type: 'varchar(7)', length: 7 });
    });

    it('stores percentage exactly like money_jar.percentage', () => {
        expect(entity.properties['percentage']).toMatchObject({
            type: 'decimal',
            precision: 5,
            scale: 2,
        });
        expect(table.columns['percentage']).toEqual({
            ...jarTable.columns['percentage'],
            name: 'percentage',
        });
    });

    it('cascades from money_jar and from auth.household', () => {
        expect(entity.properties['jar']).toMatchObject({ kind: 'm:1', deleteRule: 'cascade' });
        expect(table.foreignKeys['money_jar_share_jar_id_foreign']).toMatchObject({
            columnNames: ['jar_id'],
            referencedTableName: 'public.money_jar',
            deleteRule: 'cascade',
        });
        expect(table.foreignKeys['money_jar_share_household_id_foreign']).toMatchObject({
            columnNames: ['household_id'],
            referencedTableName: 'auth.household',
            deleteRule: 'cascade',
        });
        expect(Object.keys(table.foreignKeys)).toHaveLength(2);
    });

    it('indexes household_id, keeps one row per pot per month, and nothing else', () => {
        expect(entity.uniques).toEqual([{ properties: ['jar', 'period'] }]);
        const byKeyName = (left: { keyName: string }, right: { keyName: string }) =>
            left.keyName.localeCompare(right.keyName);
        expect(
            table.indexes
                .map(index => ({
                    keyName: index.keyName,
                    columnNames: index.columnNames,
                    unique: index.unique,
                }))
                .sort(byKeyName)
        ).toEqual([
            {
                keyName: 'money_jar_share_household_id_index',
                columnNames: ['household_id'],
                unique: false,
            },
            {
                keyName: 'money_jar_share_jar_id_period_unique',
                columnNames: ['jar_id', 'period'],
                unique: true,
            },
            { keyName: 'money_jar_share_pkey', columnNames: ['id'], unique: true },
        ]);
    });

    it('carries both checks under the entity names', () => {
        const names = entity.checks.map(check => check.name).sort();
        expect(names).toEqual([
            'money_jar_share_percentage_range',
            'money_jar_share_period_format',
        ]);
        expect(table.checks.map(check => check.name).sort()).toEqual(names);
    });
});

describe('migration SQL matches the entity and the snapshot', () => {
    it('creates every snapshot column with its type and nullability', () => {
        const create = upSql.find(sql => sql.startsWith('create table "public"."money_jar_share"'));
        expect(create).toBeDefined();
        for (const column of Object.values(table.columns)) {
            const type = column.type.replace('timestamptz(6)', 'timestamptz');
            expect(create).toContain(`"${column.name}" ${type} not null`);
        }
        expect(create).toContain('primary key ("id")');
    });

    it('adds the index, unique, checks and foreign keys the snapshot names', () => {
        const all = upSql.join('\n');
        for (const index of table.indexes.filter(candidate => !candidate.primary)) {
            expect(all).toContain(`"${index.keyName}"`);
        }
        for (const check of entity.checks) {
            expect(all).toContain(
                `add constraint "${check.name}" check (${check.expression.replace(/\s+/g, ' ')});`
            );
        }
        expect(all).toContain(
            'add constraint "money_jar_share_jar_id_foreign" foreign key ("jar_id") references "public"."money_jar" ("id") on delete cascade;'
        );
        expect(all).toContain(
            'add constraint "money_jar_share_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on delete cascade;'
        );
    });

    it('backfills every pot at the baseline period, idempotently, naming every required column', () => {
        const insert = upSql.find(sql => sql.startsWith('insert into "public"."money_jar_share"'));
        expect(insert).toBeDefined();
        const named = /^insert into \S+ \(([^)]*)\)/
            .exec(insert!)![1]!
            .split(',')
            .map(name => name.trim().replaceAll('"', ''));
        expect(named.sort()).toEqual(Object.keys(table.columns).sort());
        expect(insert).toContain(`'${JAR_SHARE_BASELINE_PERIOD}', jar."percentage", jar."id"`);
        expect(insert).toContain('from "public"."money_jar" as jar');
        expect(insert).toMatch(/on conflict \("jar_id", "period"\) do nothing;$/);
    });

    it('uses a baseline that passes the format check and sorts before every real month', () => {
        expect(JAR_SHARE_BASELINE_PERIOD).toMatch(PERIOD_FORMAT);
        expect(JAR_SHARE_BASELINE_PERIOD < '2000-01').toBe(true);
        expect('2026-11' > JAR_SHARE_BASELINE_PERIOD).toBe(true);
    });

    it('down drops the table and nothing else', () => {
        expect(downSql).toEqual(['drop table if exists "public"."money_jar_share" cascade;']);
    });

    it('never alters a better-auth table (the household FK only references it)', () => {
        const all = [...upSql, ...downSql].join(' ');
        expect(all).not.toMatch(/alter table "auth"\./);
        expect(all).not.toMatch(/(insert into|update|delete from|drop table[^;]*) "auth"\./);
    });
});
