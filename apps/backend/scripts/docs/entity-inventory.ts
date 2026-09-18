/**
 * Regenerates docs/ENTITY_INVENTORY.md from MikroORM metadata (offline, no DB).
 * Run: pnpm --filter @rumtelo/backend docs:entities
 */
import { MikroORM, ReferenceKind } from '@mikro-orm/postgresql';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import config from '../../mikro-orm.config';

const BACKEND_ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '..');

async function main() {
    const orm = await MikroORM.init({ ...config, connect: false, debug: false });
    const metas = Object.values(orm.getMetadata().getAll()).filter(
        m => !m.abstract && !m.pivotTable
    );
    const root = join(BACKEND_ROOT, 'src') + '/';
    type Row = {
        name: string;
        base: string;
        table: string;
        file: string;
        plane: string;
        rels: string[];
    };
    const rows: Row[] = metas.map(m => {
        const file = (m.path ?? '').replace(root, '').replace(/^\.\/src\//, '');
        const src = readFileSync(m.path, 'utf8');
        const parent = /export class \w+ extends (\w+)/.exec(src)?.[1] ?? '—';
        const rels: string[] = [];
        for (const p of Object.values(m.properties)) {
            if (
                p.kind === ReferenceKind.SCALAR ||
                p.kind === ReferenceKind.EMBEDDED ||
                p.name.endsWith('__inverse')
            )
                continue;
            const card =
                p.kind === ReferenceKind.MANY_TO_ONE
                    ? 'N:1'
                    : p.kind === ReferenceKind.ONE_TO_ONE
                      ? '1:1'
                      : p.kind === ReferenceKind.ONE_TO_MANY
                        ? '1:N'
                        : 'N:M';
            const rule = p.deleteRule ? ` on delete ${p.deleteRule}` : '';
            const mapToPk = p.mapToPk ? ' (mapToPk)' : '';
            rels.push(`\`${p.name}\` ${card} → ${p.type}${mapToPk}${rule}`);
        }
        const plane = file.startsWith('modules/auth/')
            ? file.includes('/managed/')
                ? 'auth · managed (better-auth writes)'
                : 'auth · Rumtelo'
            : file.startsWith('modules/public/platform')
              ? 'public · platform'
              : file.startsWith('modules/public/product/')
                ? `public · ${file.split('/')[3]}`
                : file.startsWith('modules/backoffice/plan')
                  ? 'backoffice · plan'
                  : file.startsWith('modules/backoffice/product/')
                    ? `backoffice · ${file.split('/')[3]}`
                    : 'other';
        return {
            name: m.className,
            base: parent,
            table: `${m.schema ?? 'public'}.${m.tableName}`,
            file,
            plane,
            rels,
        };
    });
    const order = [
        'auth · managed (better-auth writes)',
        'auth · Rumtelo',
        'public · platform',
        'public · money',
        'public · growth',
        'public · energy',
        'public · soul',
        'backoffice · money',
        'backoffice · growth',
        'backoffice · plan',
        'other',
    ];
    const pivots = Object.values(orm.getMetadata().getAll())
        .filter(m => m.pivotTable)
        .map(m => `${m.schema}.${m.tableName}`)
        .sort();
    const out: string[] = [];
    out.push(
        '# Entity inventory',
        '',
        `Generated from MikroORM metadata (${rows.length} entities, ${pivots.length} implicit pivot tables). Regenerate after entity changes — do not hand-edit tables.`,
        '',
        'Planes: `auth` = identity (better-auth + Rumtelo person/household rows) · `public` = household-written product data · `backoffice` = Rumtelo-written catalogs. Bases: see `ENTITY_STYLE.md`.',
        ''
    );
    for (const plane of order) {
        const group = rows
            .filter(r => r.plane === plane)
            .sort((a, b) => a.file.localeCompare(b.file));
        if (!group.length) continue;
        out.push(
            `## ${plane} (${group.length})`,
            '',
            '| Entity | Base | Table | File | Relations |',
            '|---|---|---|---|---|'
        );
        for (const r of group)
            out.push(
                `| \`${r.name}\` | \`${r.base}\` | \`${r.table}\` | \`${r.file}\` | ${r.rels.join('<br>') || '—'} |`
            );
        out.push('');
    }
    out.push('## Implicit pivot tables (`@ManyToMany`)', '', ...pivots.map(p => `- \`${p}\``), '');
    out.push(
        '## Reference policy',
        '',
        '| From → to | Storage |',
        '|---|---|',
        '| backoffice → backoffice | relation (id FK / pivot entity) |',
        '| household → backoffice | `*Key` snapshot string (`Jar.templateKey`, `Goal.givingOrganisationKey`, `Transaction.inflowKey`, `FixedCost.presetKey`) |',
        '| household → household | relation with explicit `deleteRule` |',
        ''
    );
    writeFileSync(join(BACKEND_ROOT, 'docs', 'ENTITY_INVENTORY.md'), out.join('\n'));
    console.log(`ENTITY_INVENTORY.md: ${rows.length} entities, ${pivots.length} pivots`);
    await orm.close(true);
}
main().catch(e => {
    console.error(e);
    process.exit(1);
});
