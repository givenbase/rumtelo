/**
 * Field ordering priorities for entity PROPERTIES / UI METADATA sections.
 * Also validates BaseEntity / HouseholdEntity inheritance.
 * @see apps/backend/docs/ENTITY_STYLE.md
 */

/**
 * Allowed abstract bases.
 *   BaseEntity → HouseholdEntity → WeekCheckEntity
 *   BaseEntity → CatalogEntity
 */
export const ALLOWED_ENTITY_BASES = [
    'BaseEntity',
    'HouseholdEntity',
    'CatalogEntity',
    'WeekCheckEntity',
] as const;

/** Fields each base owns — subclasses must not redeclare them. */
const BASE_OWNED_FIELDS: Record<AllowedEntityBase, readonly string[]> = {
    BaseEntity: ['id', 'createdAt', 'updatedAt'],
    HouseholdEntity: ['id', 'createdAt', 'updatedAt', 'household'],
    CatalogEntity: ['id', 'createdAt', 'updatedAt', 'key', 'name', 'sortOrder', 'isActive'],
    WeekCheckEntity: ['id', 'createdAt', 'updatedAt', 'household', 'week', 'completedAt'],
};

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
        return `${decl.className} extends ${decl.extendsName} — must extend one of ${ALLOWED_ENTITY_BASES.join(' / ')}`;
    }

    const importsBase =
        /from\s+['"][^'"]*common\/database\/(?:base|household|catalog|week-check)\.entity['"]/.test(
            text
        ) ||
        /from\s+['"][^'"]*\/(?:base|household|catalog|week-check)\.entity['"]/.test(text) ||
        /from\s+['"][^'"]*common\/database['"]/.test(text);
    if (!importsBase) {
        return `${decl.className} extends ${decl.extendsName} but does not import it from common/database`;
    }

    return null;
}

/**
 * Fields owned by the abstract base must not be redeclared on subclasses.
 */
export function findInheritedFieldRedeclarations(text: string): string[] {
    const decl = extractEntityClassDeclaration(text);
    if (!decl?.extendsName) return [];

    const owned = BASE_OWNED_FIELDS[decl.extendsName as AllowedEntityBase] ?? [
        'id',
        'createdAt',
        'updatedAt',
    ];
    const forbidden = new Set<string>(owned);

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

/** Affirmative boolean prefixes (state / possession / ability / scheduled) — see ENTITY_STYLE.md. */
const BOOLEAN_NAME_RE = /^(is|has|can|will)[A-Z]/;

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
            `"${fieldName}" looks boolean — rename to is*/has*/can*/will* (e.g. isActive, not active)`
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
    // HouseholdSettings bags — class name already says "settings"
    'money',
    'weekCheck',
    'features',
    'answers',
    // AccountSettings guided-tour progress
    'tour',
    // JarTemplate / Jar behaviour flags + Coach helper copy (mirrors contracts JarGuide)
    'capabilities',
    'guide',
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
    period: 1,
    week: 1,

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
    note: 4,

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
    counterparty: 6,
    highlight: 6,
    address: 6,
    city: 6,
    country: 6,
    postalCode: 6,

    // 7 — numeric / monetary values and small scalar facts
    amount: 7,
    balance: 7,
    originalBalance: 7,
    budgeted: 7,
    actual: 7,
    target: 7,
    saved: 7,
    monthlyContribution: 7,
    minimumPayment: 7,
    extraPayment: 7,
    interestRate: 7,
    surplus: 7,
    potentialMonthly: 7,
    targetMonthly: 7,
    priceMonthly: 7,
    score: 7,
    maxScore: 7,
    level: 7,
    points: 7,
    priority: 7,
    matchPriority: 7,
    hitCount: 7,
    rate: 7,
    percentage: 7,
    price: 7,
    quantity: 7,
    value: 7,
    sortOrder: 7,
    orderIndex: 7,
    currency: 7,
    icon: 7,
    color: 7,
    accentColor: 7,
    softColor: 7,
    badgeLabel: 7,
    groupLabel: 7,
    minNetWorth: 7,
    isBaseline: 7,
    intention: 7,
    text: 7,
    scope: 7,
    reporting: 7,
    ibanBankCode: 7,
    mcc: 7,
    matchValue: 7,
    dedupeKey: 7,
    inflowKey: 7,
    givingOrganisationKey: 7,

    // 8 — config / json
    metadata: 8,
    settings: 8,
    additionalSettings: 8,
    money: 8,
    weekCheck: 8,
    features: 8,
    answers: 8,
    tour: 8,
    capabilities: 8,
    guidePayload: 8,
    spendingStyles: 8,
    aliases: 8,
    providerIds: 8,
    causes: 8,
    signals: 8,

    // 9 — links / media
    url: 9,
    imageUrl: 9,
    linkPath: 9,
    logoDomain: 9,
    website: 9,

    // 10 — boolean flags
    isActive: 10,
    isFeatured: 10,
    isPublished: 10,
    isArchived: 10,
    isSpendable: 10,
    isBankSyncEnabled: 10,
    isCoachEnabled: 10,
    isClosed: 10,
    isFixed: 10,
    willCancelAtPeriodEnd: 10,

    // 11 — day ordinals (int, repeat every period)
    dueDay: 11,
    expectedDay: 11,
    periodStartDay: 11,
    weekCheckReminderDay: 11,
    weekCheckReminderAt: 11,

    // 12 — calendar dates and instants (see inferFieldPriority for *On / *At)
    dateOfBirth: 12,
};

/** When priorities tie, earlier names in each tuple must appear first. */
export const SAME_PRIORITY_ORDER: readonly (readonly string[])[] = [
    ['firstName', 'lastName', 'middleName'],
    ['entityId', 'entityType', 'fieldName'],
    ['household', 'account'],
    ['key', 'name', 'slug'],
    ['period', 'week'],
    ['matchValue', 'mcc', 'ibanBankCode'],
    ['aliases', 'providerIds'],
    ['budgeted', 'actual', 'target', 'saved', 'monthlyContribution'],
    [
        'amount',
        'balance',
        'originalBalance',
        'interestRate',
        'minimumPayment',
        'extraPayment',
        'rate',
        'percentage',
    ],
    ['score', 'maxScore', 'level'],
    ['isBankSyncEnabled', 'isCoachEnabled'],
    ['money', 'weekCheck', 'features', 'answers'],
    ['periodStartDay', 'weekCheckReminderDay', 'weekCheckReminderAt'],
    ['isActive', 'isArchived'],
];

export const UI_METADATA_PRIORITY: Record<string, number> = {
    color: 1,
    accentColor: 1,
    softColor: 1,
    icon: 2,
    badgeLabel: 2,
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
    if (fieldName.endsWith('At') || fieldName.endsWith('On') || fieldName.endsWith('Date')) {
        return 12;
    }
    if (fieldName.endsWith('Day')) {
        return 11;
    }
    if (BOOLEAN_NAME_RE.test(fieldName)) {
        return 10;
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
