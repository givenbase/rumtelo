/**
 * Field ordering priorities for entity PROPERTIES / UI METADATA sections.
 * Also validates BaseEntity / HouseholdEntity inheritance.
 * @see apps/backend/docs/ENTITY_STYLE.md
 */

/** Allowed concrete bases — HouseholdEntity extends BaseEntity. */
export const ALLOWED_ENTITY_BASES = ['BaseEntity', 'HouseholdEntity'] as const;

export type AllowedEntityBase = (typeof ALLOWED_ENTITY_BASES)[number];

export interface EntityClassDeclaration {
    className: string;
    extendsName: string | null;
}

/** Parse `export class Foo extends Bar` from an entity file. */
export function extractEntityClassDeclaration(text: string): EntityClassDeclaration | null {
    const match = text.match(
        /\bexport\s+class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+[^{]+)?\s*\{/
    );
    if (!match) return null;
    return {
        className: match[1],
        extendsName: match[2] ?? null,
    };
}

/**
 * Domain entities must `extends BaseEntity` or `extends HouseholdEntity`.
 * Returns an error detail string, or null when OK.
 */
export function findMissingBaseEntity(text: string): string | null {
    const decl = extractEntityClassDeclaration(text);
    if (!decl) {
        return 'Could not parse `export class …` — expected `export class Name extends BaseEntity`';
    }

    if (!decl.extendsName) {
        return `${decl.className} must extend BaseEntity or HouseholdEntity`;
    }

    if (!(ALLOWED_ENTITY_BASES as readonly string[]).includes(decl.extendsName)) {
        return `${decl.className} extends ${decl.extendsName} — must extend BaseEntity or HouseholdEntity`;
    }

    const importsBase =
        /from\s+['"][^'"]*common\/database\/(?:base|household)\.entity['"]/.test(text) ||
        /from\s+['"][^'"]*\/(?:base|household)\.entity['"]/.test(text) ||
        /from\s+['"][^'"]*common\/database['"]/.test(text);
    if (!importsBase) {
        return `${decl.className} extends ${decl.extendsName} but does not import BaseEntity / HouseholdEntity from common/database`;
    }

    return null;
}

/**
 * Fields owned by BaseEntity / HouseholdEntity must not be redeclared on subclasses.
 */
export function findInheritedFieldRedeclarations(text: string): string[] {
    const decl = extractEntityClassDeclaration(text);
    if (!decl?.extendsName) return [];

    const forbidden = new Set<string>(['id', 'createdAt', 'updatedAt']);
    if (decl.extendsName === 'HouseholdEntity') {
        forbidden.add('household');
    }

    const redeclarations: string[] = [];
    const pattern =
        /@(?:PrimaryKey|Property|Enum|ManyToOne|OneToOne)\([\s\S]*?\)\s*\n\s*(\w+)[!?]?\s*[=:]/g;
    let match: null | RegExpExecArray;
    while ((match = pattern.exec(text)) !== null) {
        const fieldName = match[1];
        if (forbidden.has(fieldName) && !redeclarations.includes(fieldName)) {
            redeclarations.push(fieldName);
        }
    }

    return redeclarations;
}

/**
 * `@ManyToOne` / `@OneToOne` fields must be relation nouns (`household`, `account`, `jar`),
 * never `*Id`. Scalar FK `@Property` fields may still use `*Id` (e.g. `appliedRuleId`).
 * @see apps/backend/docs/ENTITY_STYLE.md
 */
export function findRelationIdSuffixViolations(text: string): string[] {
    const violations: string[] = [];
    const pattern = /@(?:ManyToOne|OneToOne)\([\s\S]*?\)\s*\n\s*(\w+)[!?]?\s*[=:]/g;
    let match: null | RegExpExecArray;
    while ((match = pattern.exec(text)) !== null) {
        const fieldName = match[1];
        if (fieldName.endsWith('Id') && !violations.includes(fieldName)) {
            violations.push(fieldName);
        }
    }
    return violations;
}

/** Affirmative boolean prefixes — see ENTITY_STYLE.md field naming. */
const BOOLEAN_NAME_RE = /^(is|has|can)[A-Z]/;

/**
 * Extract `@Property` field names that look like booleans (default true/false or `: boolean`).
 */
export function extractBooleanPropertyNames(text: string): string[] {
    const fields: string[] = [];
    const pattern =
        /@Property\(([\s\S]*?)\)\s*\n\s*(\w+)[!?]?(?:\s*:\s*boolean)?(?:\s*=\s*(true|false))?/g;
    let match: null | RegExpExecArray;
    while ((match = pattern.exec(text)) !== null) {
        const opts = match[1] ?? '';
        const fieldName = match[2];
        const hasBoolDefault = /default:\s*(true|false)/.test(opts);
        const hasBoolType = /type:\s*['"]boolean['"]/.test(opts);
        const hasBoolAssign = match[3] === 'true' || match[3] === 'false';
        const hasBoolAnnotation = /:\s*boolean/.test(
            text.slice(match.index, match.index + match[0].length)
        );
        if (hasBoolDefault || hasBoolType || hasBoolAssign || hasBoolAnnotation) {
            fields.push(fieldName);
        }
    }
    return fields;
}

/**
 * Boolean `@Property` fields must use is* / has* / can* (affirmative).
 * Returns violation messages.
 */
export function findBooleanNamingViolations(text: string): string[] {
    const violations: string[] = [];
    for (const fieldName of extractBooleanPropertyNames(text)) {
        if (BOOLEAN_NAME_RE.test(fieldName)) continue;
        violations.push(
            `"${fieldName}" looks boolean — rename to is*/has*/can* (e.g. isActive, not active)`
        );
    }
    return violations;
}

type PropertyDecl = {
    fieldName: string;
    opts: string;
};

/** Parse @Property blocks → field name + decorator options. */
export function extractPropertyDeclarations(text: string): PropertyDecl[] {
    const decls: PropertyDecl[] = [];
    const pattern = /@Property\(([\s\S]*?)\)\s*\n\s*(\w+)[!?]?\s*[=:]/g;
    let match: null | RegExpExecArray;
    while ((match = pattern.exec(text)) !== null) {
        decls.push({ opts: match[1] ?? '', fieldName: match[2] });
    }
    return decls;
}

function propertyType(opts: string): 'date' | 'timestamptz' | 'json' | 'other' {
    if (/type:\s*['"]date['"]/.test(opts)) return 'date';
    if (/type:\s*['"]timestamptz['"]/.test(opts)) return 'timestamptz';
    if (/type:\s*['"]json['"]/.test(opts)) return 'json';
    return 'other';
}

/**
 * Temporal suffix must match column kind:
 *   *Day  → int ordinal (not date/timestamptz)
 *   *On   → date
 *   *At   → timestamptz
 *   *Date → discouraged; prefer *On for calendar dates (avoid clash with *Day)
 */
export function findTemporalNamingViolations(text: string): string[] {
    const violations: string[] = [];
    for (const { fieldName, opts } of extractPropertyDeclarations(text)) {
        const kind = propertyType(opts);
        const endsDay = fieldName.endsWith('Day');
        const endsOn = fieldName.endsWith('On');
        const endsAt = fieldName.endsWith('At');
        const endsDate = fieldName.endsWith('Date');

        if (endsDay && (kind === 'date' || kind === 'timestamptz')) {
            violations.push(
                `"${fieldName}" ends with Day but type is ${kind} — *Day is for int ordinals (1–31 / weekday); use *On (date) or *At (timestamptz)`
            );
        }
        if (endsOn && kind === 'timestamptz') {
            violations.push(
                `"${fieldName}" ends with On but type is timestamptz — use *At for instants (e.g. closedAt)`
            );
        }
        if (endsOn && kind !== 'date' && kind !== 'other') {
            // json already handled; other includes int defaults without explicit type
        }
        if (endsAt && kind === 'date') {
            violations.push(
                `"${fieldName}" ends with At but type is date — use *On for calendar dates (e.g. startedOn)`
            );
        }
        if (endsDate) {
            violations.push(
                `"${fieldName}" uses *Date — prefer *On for calendar dates so *Day (ordinal) stays unambiguous (dueDay ≠ dueDate)`
            );
        }
        if (kind === 'date' && !endsOn && !endsDate) {
            if (fieldName === 'dateOfBirth') {
                // Standard legal DOB field — not a period start/end *On.
            } else {
                violations.push(
                    `"${fieldName}" is type date — name it *On (e.g. startedOn, endsOn)`
                );
            }
        }
        if (kind === 'timestamptz' && !endsAt) {
            violations.push(
                `"${fieldName}" is type timestamptz — name it *At (e.g. closedAt, publishedAt)`
            );
        }
    }
    return violations;
}

/** Allowed non-plural jsonb bag names. */
const JSON_BAG_NAMES = new Set([
    'metadata',
    'settings',
    'config',
    'payload',
    'snapshot',
    'checkoutSnapshot',
    'contentBlocks',
]);

const JSON_BAG_SUFFIX_RE = /(Json|Metadata|Settings|Config|Payload|Snapshot)$/;

function looksPluralField(name: string): boolean {
    // Simple plural heuristic — aliases, unlocks, tags, audienceKeys
    if (name.endsWith('ies')) return true;
    if (name.endsWith('ses')) return true;
    if (name.endsWith('s') && !/ss$|us$|is$status|Status$/.test(name)) return true;
    return false;
}

/**
 * jsonb fields must read as arrays (plural) or clear object bags.
 */
export function findJsonNamingViolations(text: string): string[] {
    const violations: string[] = [];
    for (const { fieldName, opts } of extractPropertyDeclarations(text)) {
        if (propertyType(opts) !== 'json') continue;
        if (looksPluralField(fieldName)) continue;
        if (JSON_BAG_NAMES.has(fieldName)) continue;
        if (JSON_BAG_SUFFIX_RE.test(fieldName)) continue;
        violations.push(
            `"${fieldName}" is jsonb — use a plural array name (aliases, unlocks) or a bag noun (metadata, *Json, *Payload, *Snapshot)`
        );
    }
    return violations;
}

/** Lower number = earlier in the entity file. */
export const EXACT_FIELD_PRIORITY: Record<string, number> = {
    id: 0,
    key: 1,
    code: 1,
    identifier: 1,
    household: 1,
    account: 1,
    entityId: 1,
    version: 1,

    name: 2,
    title: 2,
    subject: 2,
    firstName: 2,
    lastName: 2,
    middleName: 2,
    label: 2,

    slug: 3,
    date: 3,

    summary: 4,
    description: 4,
    subtitle: 4,
    shortName: 4,
    why: 4,
    message: 4,
    notes: 4,

    body: 5,
    content: 5,

    role: 6,
    type: 6,
    system: 6,
    fieldName: 6,
    entityType: 6,
    email: 6,
    phone: 6,
    iban: 6,
    address: 6,
    city: 6,
    country: 6,
    postalCode: 6,

    amount: 7,
    balance: 7,
    budgeted: 7,
    actual: 7,
    target: 7,
    rate: 7,
    percentage: 7,
    price: 7,
    quantity: 7,
    sortOrder: 7,
    orderIndex: 7,
    periodStartDay: 7,
    weekCheckReminderDay: 7,
    weekCheckReminderAt: 7,
    dueDay: 7,
    expectedDay: 7,
    suggestedDueDay: 7,
    currency: 7,
    icon: 7,
    color: 7,
    accentColor: 7,
    softColor: 7,
    badgeLabel: 7,
    minNetWorth: 7,
    isBaseline: 7,

    metadata: 8,
    settings: 8,
    additionalSettings: 8,
    moneySettings: 8,
    weekCheckSettings: 8,
    featureSettings: 8,
    answers: 8,
    capabilities: 8,
    forPostureKeys: 8,
    forSpendingStyles: 8,
    minStageKey: 8,
    aliases: 8,
    markets: 8,
    providerIds: 8,

    url: 9,
    imageUrl: 9,
    linkPath: 9,
    logoDomain: 9,
    website: 9,

    isActive: 10,
    isFeatured: 10,
    isPublished: 10,
    isArchived: 10,
    isSpendable: 10,
    isBankSyncEnabled: 10,
    isCoachEnabled: 10,
    isDone: 10,
    isClosed: 10,
    isFixed: 10,

    expiresAt: 11,
    completedAt: 11,
    closedAt: 11,
    dueDate: 11,
    startDate: 11,
    endDate: 11,
    startedOn: 11,
    endsOn: 11,
    targetOn: 11,
    publishedAt: 11,
};

/** When priorities tie, earlier names in each tuple must appear first. */
export const SAME_PRIORITY_ORDER: readonly (readonly string[])[] = [
    ['firstName', 'lastName', 'middleName'],
    ['entityId', 'entityType', 'fieldName'],
    ['household', 'account'],
    ['key', 'name', 'slug'],
    ['matchValue', 'mcc', 'categoryTemplateKey', 'ibanBankCode'],
    ['aliases', 'markets', 'providerIds'],
    ['budgeted', 'actual', 'target'],
    ['amount', 'balance', 'rate', 'percentage'],
    ['isBankSyncEnabled', 'isCoachEnabled'],
    ['moneySettings', 'weekCheckSettings', 'featureSettings', 'answers'],
    ['periodStartDay', 'weekCheckReminderDay', 'weekCheckReminderAt'],
];

export const UI_METADATA_PRIORITY: Record<string, number> = {
    color: 1,
    accentColor: 1,
    softColor: 1,
    icon: 2,
    logoDomain: 3,
    website: 4,
    highlight: 5,
    isFeatured: 6,
    sortOrder: 7,
};

export function inferFieldPriority(fieldName: string): number {
    if (fieldName in EXACT_FIELD_PRIORITY) {
        return EXACT_FIELD_PRIORITY[fieldName];
    }
    if (
        fieldName.startsWith('email') ||
        fieldName.startsWith('push') ||
        fieldName.startsWith('sms')
    ) {
        return 10;
    }
    if (fieldName.endsWith('At') || fieldName.endsWith('Date')) {
        return 11;
    }
    if (fieldName.includes('Url') || fieldName.includes('Path')) {
        return 9;
    }
    return 7;
}

function chainIndex(fieldName: string): { chain: readonly string[]; index: number } | null {
    for (const chain of SAME_PRIORITY_ORDER) {
        const idx = chain.indexOf(fieldName);
        if (idx !== -1) {
            return { chain, index: idx };
        }
    }
    return null;
}

/** Negative when `a` should appear before `b`. */
export function compareFieldOrder(
    a: string,
    b: string,
    section: 'properties' | 'ui-metadata'
): number {
    const chainA = chainIndex(a);
    const chainB = chainIndex(b);

    if (chainA && chainB && chainA.chain === chainB.chain) {
        return chainA.index - chainB.index;
    }

    const priorityA =
        section === 'ui-metadata'
            ? (UI_METADATA_PRIORITY[a] ?? inferFieldPriority(a))
            : inferFieldPriority(a);
    const priorityB =
        section === 'ui-metadata'
            ? (UI_METADATA_PRIORITY[b] ?? inferFieldPriority(b))
            : inferFieldPriority(b);

    if (priorityA !== priorityB) {
        return priorityA - priorityB;
    }

    return 0;
}

export function extractPropertyFieldNames(block: string): string[] {
    const fields: string[] = [];
    const pattern = /@Property\([\s\S]*?\)\s*\n\s*(\w+)[!?]?\s*[=:]/g;
    let match: null | RegExpExecArray;
    while ((match = pattern.exec(block)) !== null) {
        fields.push(match[1]);
    }
    return fields;
}

export interface FieldOrderViolation {
    after: string;
    before: string;
}

export function findFieldOrderViolations(
    fields: string[],
    section: 'properties' | 'ui-metadata'
): FieldOrderViolation[] {
    const violations: FieldOrderViolation[] = [];
    for (let i = 0; i < fields.length - 1; i++) {
        const before = fields[i];
        const after = fields[i + 1];
        if (compareFieldOrder(before, after, section) > 0) {
            violations.push({ before, after });
        }
    }
    return violations;
}
