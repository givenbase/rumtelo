/**
 * Validates MikroORM entity files against ENTITY_STYLE.md conventions.
 *
 * Usage: pnpm --filter @rumtelo/backend lint:entities
 * @see apps/backend/docs/ENTITY_STYLE.md
 * @see scripts/lint/entity-field-priority.ts
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    extractEntityClassDeclaration,
    extractPropertyFieldNames,
    findBooleanNamingViolations,
    findFieldOrderViolations,
    findInheritedFieldRedeclarations,
    findJsonNamingViolations,
    findMissingBaseEntity,
    findRelationIdSuffixViolations,
    findTemporalNamingViolations,
    UI_METADATA_PRIORITY,
} from './entity-field-priority';

const BACKEND_ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
const SRC_ROOT = join(BACKEND_ROOT, 'src');

/** Abstract bases — no @Entity, no table; the rules below target concrete entities. */
const EXCLUDED = new Set([
    'common/database/base.entity.ts',
    'common/database/household.entity.ts',
    'common/database/catalog.entity.ts',
    'common/database/week-check.entity.ts',
]);

/**
 * Path prefixes (relative to SRC_ROOT) whose entity files are owned by a library.
 * Better Auth tables are mirrored under `modules/auth/<plane>/managed/`.
 */
const EXCLUDED_PREFIXES: readonly string[] = [
    'modules/auth/user/managed/',
    'modules/auth/household/managed/',
];

/**
 * Prefer BaseEntity / HouseholdEntity for domain entities.
 * Better Auth mirrors under managed/ are excluded separately.
 */
const ALLOWED_WITHOUT_BASE_ENTITY = new Set<string>([]);

/**
 * Household-scoped entities that must be **1:1** with a household
 * (`@Unique({ properties: ['householdId'] })`). Product rows (jars, …) stay 1:N.
 * @see apps/backend/docs/ENTITY_STYLE.md
 */
const HOUSEHOLD_ONE_TO_ONE_ENTITIES = new Set<string>(['HouseholdSettings', 'HouseholdBilling']);

const CANONICAL_SECTIONS = [
    'PROPERTIES',
    'UI METADATA',
    'ENUMS',
    'RELATIONSHIPS',
    'VIRTUAL PROPERTIES (GETTERS)',
] as const;

type CanonicalSection = (typeof CANONICAL_SECTIONS)[number];

interface EntityIssue {
    detail: string;
    file: string;
    rule: string;
    severity: 'error' | 'warn';
}

function walkEntityFiles(dir: string, acc: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
            walkEntityFiles(full, acc);
            continue;
        }
        if (entry.endsWith('.entity.ts')) {
            acc.push(full);
        }
    }
    return acc;
}

function sectionIndex(sections: CanonicalSection[], name: CanonicalSection): number {
    return sections.indexOf(name);
}

/**
 * Section markers in the order they actually appear in the file.
 * Sorting by offset (not by canonical order) is what makes the
 * section-order checks below meaningful.
 */
function extractSections(text: string): CanonicalSection[] {
    return CANONICAL_SECTIONS.map(name => ({ name, at: text.indexOf(`// ? ${name}`) }))
        .filter(entry => entry.at !== -1)
        .sort((left, right) => left.at - right.at)
        .map(entry => entry.name);
}

function sliceBetween(text: string, startMarker: string, endMarkers: string[]): string {
    const start = text.indexOf(startMarker);
    if (start === -1) return '';

    let end = text.length;
    const afterStart = start + startMarker.length;
    for (const marker of endMarkers) {
        const idx = text.indexOf(marker, afterStart);
        if (idx !== -1) {
            end = Math.min(end, idx);
        }
    }
    return text.slice(afterStart, end);
}

function pushIssue(
    issues: EntityIssue[],
    file: string,
    rule: string,
    detail: string,
    severity: EntityIssue['severity'] = 'error'
): void {
    issues.push({ file, rule, detail, severity });
}

function validateEntity(absPath: string): EntityIssue[] {
    const rel = relative(SRC_ROOT, absPath).replace(/\\/g, '/');
    if (EXCLUDED.has(rel) || EXCLUDED_PREFIXES.some(prefix => rel.startsWith(prefix))) {
        return [];
    }

    const text = readFileSync(absPath, 'utf8');
    const issues: EntityIssue[] = [];
    const file = `src/${rel}`;

    const hasProperty = /@Property\(/.test(text);
    const hasEnum = /@Enum\(/.test(text);
    const hasRelationship = /@(ManyToOne|OneToMany|ManyToMany|OneToOne)\(/.test(text);
    const sections = extractSections(text);

    if (!ALLOWED_WITHOUT_BASE_ENTITY.has(rel)) {
        const baseIssue = findMissingBaseEntity(text);
        if (baseIssue) {
            pushIssue(issues, file, 'extends-base-entity', baseIssue);
        } else {
            for (const fieldName of findInheritedFieldRedeclarations(text)) {
                pushIssue(
                    issues,
                    file,
                    'redeclare-inherited-field',
                    `Do not redeclare "${fieldName}" — it comes from BaseEntity / HouseholdEntity`
                );
            }
        }
    }

    const decl = extractEntityClassDeclaration(text);
    if (decl && HOUSEHOLD_ONE_TO_ONE_ENTITIES.has(decl.className)) {
        const hasUniqueHouseholdId =
            /@Unique\(\s*\{\s*properties:\s*\[[^\]]*['"]household['"][^\]]*\]/.test(text);
        if (!hasUniqueHouseholdId) {
            pushIssue(
                issues,
                file,
                'household-one-to-one-unique',
                `${decl.className} is a 1:1 household entity — add @Unique({ properties: ['household'] })`
            );
        }
        if (decl.extendsName !== 'HouseholdEntity') {
            pushIssue(
                issues,
                file,
                'household-one-to-one-base',
                `${decl.className} must extend HouseholdEntity (1:1 household-owned)`
            );
        }
    }

    for (const detail of findBooleanNamingViolations(text)) {
        pushIssue(issues, file, 'boolean-naming', detail);
    }

    for (const fieldName of findRelationIdSuffixViolations(text)) {
        pushIssue(
            issues,
            file,
            'relation-id-suffix',
            `Relationship field "${fieldName}" must not end in Id — use the relation noun (e.g. household, account, jar)`
        );
    }

    for (const detail of findTemporalNamingViolations(text)) {
        pushIssue(issues, file, 'temporal-naming', detail);
    }

    for (const detail of findJsonNamingViolations(text)) {
        pushIssue(issues, file, 'json-naming', detail);
    }

    if (!/\/\*\*[\s\S]*?\*\/\s*@Entity/.test(text)) {
        pushIssue(
            issues,
            file,
            'class-jsdoc',
            'Entity class must have a JSDoc block immediately before @Entity'
        );
    }

    if (!text.includes('@see https://mikro-orm.io/docs/defining-entities')) {
        pushIssue(
            issues,
            file,
            'class-jsdoc-see',
            'Class JSDoc must include @see https://mikro-orm.io/docs/defining-entities'
        );
    }

    if (hasProperty && !sections.includes('PROPERTIES')) {
        pushIssue(
            issues,
            file,
            'missing-properties-section',
            'File has @Property fields but is missing // ? PROPERTIES'
        );
    }

    if (hasEnum && !sections.includes('ENUMS')) {
        pushIssue(
            issues,
            file,
            'missing-enums-section',
            'File has @Enum fields but is missing // ? ENUMS'
        );
    }

    if (hasRelationship && !sections.includes('RELATIONSHIPS')) {
        pushIssue(
            issues,
            file,
            'missing-relationships-section',
            'File has relationship decorators but is missing // ? RELATIONSHIPS'
        );
    }

    for (let i = 1; i < sections.length; i++) {
        const prev = CANONICAL_SECTIONS.indexOf(sections[i - 1]);
        const curr = CANONICAL_SECTIONS.indexOf(sections[i]);
        if (curr < prev) {
            pushIssue(
                issues,
                file,
                'section-order',
                `Sections out of order: // ? ${sections[i]} must come before // ? ${sections[i - 1]}`
            );
        }
    }

    if (sections.includes('PROPERTIES') && sections.includes('RELATIONSHIPS')) {
        if (sectionIndex(sections, 'RELATIONSHIPS') < sectionIndex(sections, 'PROPERTIES')) {
            pushIssue(
                issues,
                file,
                'relationships-before-properties',
                '// ? RELATIONSHIPS must not appear before // ? PROPERTIES'
            );
        }
    }

    if (sections.includes('ENUMS') && sections.includes('RELATIONSHIPS')) {
        if (sectionIndex(sections, 'RELATIONSHIPS') < sectionIndex(sections, 'ENUMS')) {
            pushIssue(
                issues,
                file,
                'relationships-before-enums',
                '// ? RELATIONSHIPS must not appear before // ? ENUMS'
            );
        }
    }

    if (text.includes('// ? PROPERTIES')) {
        const propsBlock = sliceBetween(text, '// ? PROPERTIES', [
            '// ? UI METADATA',
            '// ? ENUMS',
            '// ? RELATIONSHIPS',
            '// ? VIRTUAL PROPERTIES (GETTERS)',
        ]);
        if (/@Enum\(/.test(propsBlock)) {
            pushIssue(
                issues,
                file,
                'enum-in-properties',
                '@Enum must be under // ? ENUMS, not // ? PROPERTIES'
            );
        }
        if (/@(ManyToOne|OneToMany|ManyToMany|OneToOne)\(/.test(propsBlock)) {
            pushIssue(
                issues,
                file,
                'relationship-in-properties',
                'Relationship decorators must be under // ? RELATIONSHIPS'
            );
        }

        for (const violation of findFieldOrderViolations(
            extractPropertyFieldNames(propsBlock),
            'properties'
        )) {
            pushIssue(
                issues,
                file,
                'property-order',
                `In // ? PROPERTIES, "${violation.before}" should appear after "${violation.after}" (see ENTITY_STYLE.md field order)`
            );
        }
    }

    if (text.includes('// ? UI METADATA')) {
        const uiBlock = sliceBetween(text, '// ? UI METADATA', [
            '// ? ENUMS',
            '// ? RELATIONSHIPS',
            '// ? VIRTUAL PROPERTIES (GETTERS)',
        ]);
        if (/@Enum\(/.test(uiBlock)) {
            pushIssue(
                issues,
                file,
                'enum-in-ui-metadata',
                '@Enum must be under // ? ENUMS, not // ? UI METADATA'
            );
        }
        if (/@(ManyToOne|OneToMany|ManyToMany|OneToOne)\(/.test(uiBlock)) {
            pushIssue(
                issues,
                file,
                'relationship-in-ui-metadata',
                'Relationship decorators must be under // ? RELATIONSHIPS'
            );
        }

        // UI METADATA is for presentation hints only — lifecycle flags such as
        // isActive belong in PROPERTIES like every other entity.
        for (const fieldName of extractPropertyFieldNames(uiBlock)) {
            if (!(fieldName in UI_METADATA_PRIORITY)) {
                pushIssue(
                    issues,
                    file,
                    'ui-metadata-field',
                    `"${fieldName}" is not presentation metadata — move it to // ? PROPERTIES (allowed here: ${Object.keys(UI_METADATA_PRIORITY).join(', ')})`
                );
            }
        }

        for (const violation of findFieldOrderViolations(
            extractPropertyFieldNames(uiBlock),
            'ui-metadata'
        )) {
            pushIssue(
                issues,
                file,
                'ui-metadata-order',
                `In // ? UI METADATA, "${violation.before}" should appear after "${violation.after}"`
            );
        }
    }

    if (text.includes('// ? ENUMS')) {
        const enumsBlock = sliceBetween(text, '// ? ENUMS', [
            '// ? RELATIONSHIPS',
            '// ? VIRTUAL PROPERTIES (GETTERS)',
        ]);
        if (/@Property\(/.test(enumsBlock)) {
            pushIssue(
                issues,
                file,
                'property-in-enums',
                '@Property must be under // ? PROPERTIES, not // ? ENUMS'
            );
        }
        if (/@(ManyToOne|OneToMany|ManyToMany|OneToOne)\(/.test(enumsBlock)) {
            pushIssue(
                issues,
                file,
                'relationship-in-enums',
                'Relationship decorators must be under // ? RELATIONSHIPS'
            );
        }

        // Every @Enum must use NativeEnum({ …, domain: '…' }) so PG types are
        // product-prefixed (money_debt_kind, platform_currency, …).
        const enumCalls = enumsBlock.match(/@Enum\s*\(/g) ?? [];
        if (enumCalls.length > 0) {
            if (!/NativeEnum\s*\(/.test(enumsBlock)) {
                pushIssue(
                    issues,
                    file,
                    'enum-missing-native-enum',
                    '@Enum must use NativeEnum({ EnumName, domain: "…" }) — see native-enum.util.ts'
                );
            } else {
                // Each NativeEnum call must include domain: '…'
                const nativeCalls = [
                    ...enumsBlock.matchAll(/NativeEnum\s*\(\s*\{([\s\S]*?)\}\s*\)/g),
                ];
                for (const match of nativeCalls) {
                    const body = match[1] ?? '';
                    if (!/\bdomain\s*:/.test(body)) {
                        pushIssue(
                            issues,
                            file,
                            'enum-missing-domain',
                            'NativeEnum must set domain (auth|backoffice|platform|money|growth|energy|soul) so the PG type is prefixed'
                        );
                    }
                }
                if (nativeCalls.length === 0 && /NativeEnum\s*\(/.test(enumsBlock)) {
                    pushIssue(
                        issues,
                        file,
                        'enum-native-enum-shape',
                        'NativeEnum call could not be parsed — use NativeEnum({ EnumName, domain: "…" })'
                    );
                }
            }
        }
    }

    // @Index / @Unique belong on the class (with @Entity), never on fields
    const classDeclMatch = text.match(/\bexport\s+class\s+\w+/);
    if (classDeclMatch?.index !== undefined) {
        const classBody = text.slice(classDeclMatch.index);
        const fieldIndexOrUnique = classBody.match(/@(Index|Unique)\s*\(/g);
        if (fieldIndexOrUnique) {
            const kinds = [
                ...new Set(fieldIndexOrUnique.map(match => match.replace(/\s*\($/, ''))),
            ];
            pushIssue(
                issues,
                file,
                'index-unique-on-field',
                `${kinds.join(' / ')} must be class-level (above export class), not on fields — use @Index({ properties: ['field'] }) / @Unique({ properties: ['field'] })`,
                'warn'
            );
        }
    }

    return issues;
}

function main(): void {
    const files = walkEntityFiles(SRC_ROOT).sort();
    const allIssues: EntityIssue[] = [];

    for (const file of files) {
        allIssues.push(...validateEntity(file));
    }

    const domainCount = files.filter(file => {
        const rel = relative(SRC_ROOT, file).replace(/\\/g, '/');
        return !EXCLUDED.has(rel) && !EXCLUDED_PREFIXES.some(prefix => rel.startsWith(prefix));
    }).length;

    const errors = allIssues.filter(issue => issue.severity === 'error');
    const warnings = allIssues.filter(issue => issue.severity === 'warn');

    if (warnings.length > 0) {
        console.warn(`⚠️  Entity style warnings (${warnings.length}):\n`);
        for (const issue of warnings) {
            console.warn(`  ${issue.file}`);
            console.warn(`    [${issue.rule}] ${issue.detail}\n`);
        }
    }

    if (errors.length === 0) {
        const suffix = warnings.length > 0 ? `, ${warnings.length} warning(s)` : '';
        console.log(`✅ Entity style check passed (${domainCount} files${suffix})`);
        return;
    }

    console.error(
        `❌ Entity style check failed (${errors.length} error(s) in ${domainCount} files)\n`
    );
    for (const issue of errors) {
        console.error(`  ${issue.file}`);
        console.error(`    [${issue.rule}] ${issue.detail}\n`);
    }
    process.exit(1);
}

main();
