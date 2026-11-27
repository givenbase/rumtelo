/**
 * Static scan of the message keys the apps ask next-intl for.
 *
 * Used by `key-usage.test.ts`: a key that code uses but `languages/*.json`
 * lacks fails `pnpm --filter @rumtelo/i18n test` (and the pre-commit hook)
 * instead of showing `MISSING_MESSAGE` in the browser.
 *
 * Reads the TypeScript AST, not regexes:
 * - translators: `const t = useTranslations('ns')`, `await getTranslations('ns')`,
 *   `getTranslations({ locale, namespace })`, `Promise.all([getTranslations(…), …])`,
 *   and parameters typed as a translator (`ReturnType<typeof useTranslations<'ns'>>`,
 *   `TranslateFn`, `(key: string, …) => string`);
 * - calls: `t('key')`, `t.rich('key')`, `t.markup('key')`, `t.raw('key')`;
 *   `t.has('key')` is a runtime probe and is skipped on purpose;
 * - key constants: object properties and variables named `*Key` with a
 *   string value (`labelKey: 'pages.nav.pills.money'`).
 *
 * An argument resolves to static keys (literals, ternaries of literals,
 * template literals whose holes are ternaries of literals), to a pattern
 * (any other template literal: at least one message must match) or to
 * "unchecked" (a variable or call — listed, not failed).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import ts from 'typescript';

/** Namespace of a translator: a dot path, `''` for the root, `null` when unknown. */
export type Namespace = string | null;

type Where = { file: string; line: number };

export type KeyUse =
    | (Where & {
          kind: 'static';
          namespace: Namespace;
          key: string;
          /** `t.raw` may return an object; every other call needs a string leaf. */
          allowObject: boolean;
      })
    | (Where & {
          kind: 'pattern';
          namespace: Namespace;
          /** The template literal as written, e.g. `` `layer_${layer}` ``. */
          text: string;
          regex: RegExp;
      })
    | (Where & { kind: 'unchecked'; namespace: Namespace; text: string })
    | (Where & { kind: 'namespace'; namespace: string });

/** Translators that arrive untyped, per file: `{ 'apps/…/file.ts': { t: 'features.coach' } }`. */
export type NamespaceHints = Readonly<Record<string, Readonly<Record<string, string>>>>;

const SKIP_DIRS = new Set(['node_modules', '.next', 'dist', 'build', 'coverage', '.turbo']);
const SOURCE_FILE = /\.(ts|tsx)$/;
const SKIP_FILE = /\.(test|spec)\.(ts|tsx)$|\.d\.ts$/;
const KEY_SHAPE = /^[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)*$/;
const TRANSLATOR_NAME = /^t([A-Z][A-Za-z0-9]*)?$/;
const TRANSLATOR_TYPE =
    /typeof (useTranslations|getTranslations)|TranslateFn|\(\s*key\s*:\s*string\b/;
/** `*Key` names that hold something other than a message key. */
const NON_MESSAGE_KEY_NAMES = new Set([
    'apiKey',
    'cacheKey',
    'eventKey',
    'hotKey',
    'idKey',
    'idempotencyKey',
    'jarKey',
    'localStorageKey',
    'mutationKey',
    'planKey',
    'publicKey',
    'queryKey',
    'routeKey',
    'rowKey',
    'sortKey',
    'storageKey',
    'uncategorizedKey',
]);

export function listSourceFiles(root: string, dirs: readonly string[]): string[] {
    const out: string[] = [];
    const walk = (dir: string) => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            if (entry.isDirectory()) {
                if (!SKIP_DIRS.has(entry.name)) walk(join(dir, entry.name));
            } else if (SOURCE_FILE.test(entry.name) && !SKIP_FILE.test(entry.name)) {
                out.push(join(dir, entry.name));
            }
        }
    };
    for (const dir of dirs) walk(join(root, dir));
    return out.sort();
}

function stripExpression(node: ts.Expression): ts.Expression {
    let current = node;
    while (
        ts.isParenthesizedExpression(current) ||
        ts.isAsExpression(current) ||
        ts.isSatisfiesExpression(current) ||
        ts.isNonNullExpression(current) ||
        ts.isAwaitExpression(current)
    ) {
        current = current.expression;
    }
    return current;
}

/** Namespace a `useTranslations(…)` / `getTranslations(…)` call binds; `undefined` if it is not one. */
function translatorCallNamespace(node: ts.Expression): Namespace | undefined {
    const call = stripExpression(node);
    if (!ts.isCallExpression(call) || !ts.isIdentifier(call.expression)) return undefined;
    const callee = call.expression.text;
    if (callee !== 'useTranslations' && callee !== 'getTranslations') return undefined;
    const [first] = call.arguments;
    if (!first) return '';
    const arg = stripExpression(first);
    if (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) return arg.text;
    if (ts.isObjectLiteralExpression(arg)) {
        const namespaceProp = arg.properties.find(
            prop => ts.isPropertyAssignment(prop) && prop.name.getText() === 'namespace'
        );
        if (!namespaceProp) return '';
        if (ts.isPropertyAssignment(namespaceProp)) {
            const value = stripExpression(namespaceProp.initializer);
            if (ts.isStringLiteral(value)) return value.text;
        }
    }
    return null;
}

function namespaceFromType(typeText: string): Namespace {
    const match = /typeof (?:useTranslations|getTranslations)<\s*['"]([^'"]+)['"]\s*>/.exec(
        typeText
    );
    return match ? match[1]! : null;
}

function bindingFromDeclaration(
    declaration: ts.VariableDeclaration,
    name: string
): Namespace | undefined {
    const init = declaration.initializer;
    if (ts.isIdentifier(declaration.name)) {
        if (declaration.name.text !== name) return undefined;
        if (init) {
            const namespace = translatorCallNamespace(init);
            if (namespace !== undefined) return namespace;
        }
        const typeText = declaration.type?.getText() ?? '';
        return TRANSLATOR_TYPE.test(typeText) ? namespaceFromType(typeText) : undefined;
    }
    // `const [t, tCommon] = await Promise.all([getTranslations('a'), getTranslations('b')])`
    if (ts.isArrayBindingPattern(declaration.name) && init) {
        const all = stripExpression(init);
        const list = ts.isCallExpression(all) ? all.arguments[0] : undefined;
        if (!list || !ts.isArrayLiteralExpression(list)) return undefined;
        for (const [index, element] of declaration.name.elements.entries()) {
            const call = list.elements[index];
            if (
                call &&
                ts.isBindingElement(element) &&
                ts.isIdentifier(element.name) &&
                element.name.text === name
            ) {
                return translatorCallNamespace(call);
            }
        }
    }
    return undefined;
}

function declaresName(fn: ts.SignatureDeclaration, name: string): boolean {
    const found = (binding: ts.BindingName): boolean =>
        ts.isIdentifier(binding)
            ? binding.text === name
            : binding.elements.some(
                  element => !ts.isOmittedExpression(element) && found(element.name)
              );
    return fn.parameters.some(parameter => found(parameter.name));
}

/**
 * Nearest translator binding for `name` in scope at `node`.
 * `undefined` when `name` is bound to something that is not a translator.
 */
function resolveTranslator(
    node: ts.Node,
    name: string,
    hint: string | undefined
): { namespace: Namespace } | undefined {
    for (let current: ts.Node | undefined = node.parent; current; current = current.parent) {
        if (ts.isFunctionLike(current) && declaresName(current, name)) {
            const parameter = current.parameters.find(
                param => ts.isIdentifier(param.name) && param.name.text === name
            );
            const typeText = parameter?.type?.getText() ?? '';
            if (TRANSLATOR_TYPE.test(typeText)) {
                return { namespace: hint ?? namespaceFromType(typeText) };
            }
            // Untyped or destructured (`{ t }`): a translator by name only.
            return TRANSLATOR_NAME.test(name) ? { namespace: hint ?? null } : undefined;
        }
        if (ts.isBlock(current) || ts.isSourceFile(current) || ts.isModuleBlock(current)) {
            for (const statement of current.statements) {
                if (!ts.isVariableStatement(statement)) continue;
                for (const declaration of statement.declarationList.declarations) {
                    const namespace = bindingFromDeclaration(declaration, name);
                    if (namespace !== undefined) return { namespace: hint ?? namespace };
                }
            }
        }
    }
    return TRANSLATOR_NAME.test(name) ? { namespace: hint ?? null } : undefined;
}

type Candidate =
    | { kind: 'static'; key: string }
    | { kind: 'pattern'; text: string; regex: RegExp }
    | { kind: 'unchecked'; text: string };

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Literal strings an expression can evaluate to, or `null` when a branch is not literal. */
function literalValues(node: ts.Expression): string[] | null {
    const expr = stripExpression(node);
    if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) return [expr.text];
    if (ts.isConditionalExpression(expr)) {
        const whenTrue = literalValues(expr.whenTrue);
        const whenFalse = literalValues(expr.whenFalse);
        return whenTrue && whenFalse ? [...whenTrue, ...whenFalse] : null;
    }
    return null;
}

function keyCandidates(node: ts.Expression): Candidate[] {
    const expr = stripExpression(node);
    if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) {
        return [{ kind: 'static', key: expr.text }];
    }
    if (ts.isConditionalExpression(expr)) {
        return [...keyCandidates(expr.whenTrue), ...keyCandidates(expr.whenFalse)];
    }
    if (
        ts.isBinaryExpression(expr) &&
        (expr.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken ||
            expr.operatorToken.kind === ts.SyntaxKind.BarBarToken)
    ) {
        return [...keyCandidates(expr.left), ...keyCandidates(expr.right)];
    }
    if (ts.isTemplateExpression(expr)) {
        // Holes that are ternaries of literals expand to every static key (`text_${n === 1 ? 'one' : 'other'}`).
        let expanded: string[] | null = [expr.head.text];
        for (const span of expr.templateSpans) {
            const values = literalValues(span.expression);
            if (!values || !expanded) {
                expanded = null;
                break;
            }
            const prefixes: string[] = expanded;
            expanded = prefixes.flatMap(prefix =>
                values.map(value => `${prefix}${value}${span.literal.text}`)
            );
        }
        if (expanded) return expanded.map(key => ({ kind: 'static', key }));
        const source =
            escapeRegex(expr.head.text) +
            expr.templateSpans
                .map(span => `[A-Za-z0-9_.-]+${escapeRegex(span.literal.text)}`)
                .join('');
        return [{ kind: 'pattern', text: expr.getText(), regex: new RegExp(`^${source}$`) }];
    }
    return [{ kind: 'unchecked', text: expr.getText() }];
}

const MAYBE_I18N = /useTranslations|getTranslations|TranslateFn|[a-z]Key\b|\bt[A-Z]?\w*\(/;

export function scanFile(filePath: string, root: string, hints: NamespaceHints = {}): KeyUse[] {
    const text = readFileSync(filePath, 'utf8');
    if (!MAYBE_I18N.test(text)) return [];
    const file = relative(root, filePath);
    const fileHints = hints[file] ?? {};
    const sourceFile = ts.createSourceFile(
        filePath,
        text,
        ts.ScriptTarget.Latest,
        true,
        filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );
    const uses: KeyUse[] = [];
    const lineOf = (node: ts.Node) =>
        sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;

    const pushCall = (
        node: ts.Node,
        arg: ts.Expression,
        namespace: Namespace,
        allowObject: boolean
    ) => {
        const where = { file, line: lineOf(node) };
        for (const candidate of keyCandidates(arg)) {
            if (candidate.kind !== 'static') {
                uses.push({ ...candidate, ...where, namespace });
            } else if (KEY_SHAPE.test(candidate.key)) {
                uses.push({ kind: 'static', ...where, namespace, key: candidate.key, allowObject });
            }
        }
    };

    const visit = (node: ts.Node) => {
        if (ts.isCallExpression(node)) {
            const bound = translatorCallNamespace(node);
            if (typeof bound === 'string' && bound !== '') {
                uses.push({ kind: 'namespace', file, line: lineOf(node), namespace: bound });
            }
            const callee = node.expression;
            const [arg] = node.arguments;
            if (arg && ts.isIdentifier(callee)) {
                const binding = resolveTranslator(node, callee.text, fileHints[callee.text]);
                if (binding) pushCall(node, arg, binding.namespace, false);
            } else if (
                arg &&
                ts.isPropertyAccessExpression(callee) &&
                ts.isIdentifier(callee.expression) &&
                ['rich', 'markup', 'raw'].includes(callee.name.text)
            ) {
                const name = callee.expression.text;
                const binding = resolveTranslator(node, name, fileHints[name]);
                if (binding) pushCall(node, arg, binding.namespace, callee.name.text === 'raw');
            }
        }
        // Key constants: `{ labelKey: 'pages.nav.pills.money' }`, `const titleKey = '…'`.
        if (
            (ts.isPropertyAssignment(node) || ts.isVariableDeclaration(node)) &&
            node.initializer &&
            (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)) &&
            /[a-z]Key$/.test(node.name.text) &&
            !NON_MESSAGE_KEY_NAMES.has(node.name.text)
        ) {
            for (const value of literalValues(node.initializer) ?? []) {
                if (!KEY_SHAPE.test(value) || !/[a-z]/.test(value)) continue;
                uses.push({
                    kind: 'static',
                    file,
                    line: lineOf(node),
                    namespace: null,
                    key: value,
                    allowObject: false,
                });
            }
        }
        ts.forEachChild(node, visit);
    };
    visit(sourceFile);
    return uses;
}

export type Catalog = {
    /** Dot path → node type, for every leaf and object. */
    nodes: Map<string, 'string' | 'object' | 'other'>;
    /** Every proper dotted suffix of every string leaf (`a.b.c` → `b.c`, `c`). */
    leafSuffixes: Set<string>;
    leaves: string[];
};

export function buildCatalog(tree: unknown): Catalog {
    const nodes = new Map<string, 'string' | 'object' | 'other'>();
    const leafSuffixes = new Set<string>();
    const leaves: string[] = [];
    const walk = (node: unknown, path: string[]) => {
        const dotPath = path.join('.');
        if (typeof node === 'string') {
            nodes.set(dotPath, 'string');
            leaves.push(dotPath);
            for (let index = 1; index < path.length; index++) {
                leafSuffixes.add(path.slice(index).join('.'));
            }
            return;
        }
        if (node && typeof node === 'object') {
            if (path.length > 0) nodes.set(dotPath, 'object');
            for (const [key, value] of Object.entries(node)) walk(value, [...path, key]);
            return;
        }
        nodes.set(dotPath, 'other');
    };
    walk(tree, []);
    return { nodes, leafSuffixes, leaves };
}

const withNamespace = (namespace: string, key: string) => (namespace ? `${namespace}.${key}` : key);

/** Why a use does not resolve in this catalog, or `null` when it does. */
export function checkUse(use: KeyUse, catalog: Catalog): string | null {
    switch (use.kind) {
        case 'namespace':
            return catalog.nodes.get(use.namespace) === 'object'
                ? null
                : `namespace "${use.namespace}" does not exist`;
        case 'static': {
            if (use.namespace === null) {
                // Namespace unknown: the key must be a full path or end some message path.
                if (catalog.nodes.get(use.key) === 'string') return null;
                if (catalog.leafSuffixes.has(use.key)) return null;
                if (use.allowObject && catalog.nodes.has(use.key)) return null;
                return `"${use.key}" is not a message in any namespace`;
            }
            const full = withNamespace(use.namespace, use.key);
            const type = catalog.nodes.get(full);
            if (type === 'string' || (use.allowObject && type === 'object')) return null;
            return type ? `"${full}" is an ${type}, not a message` : `"${full}" is missing`;
        }
        case 'pattern': {
            const prefix = use.namespace ? `${use.namespace}.` : '';
            // Any node, not only string leaves: `t.raw(`sections.${id}.items`)` reads an array.
            const matches = [...catalog.nodes.keys()].some(leaf => {
                if (use.namespace === null) {
                    const segments = leaf.split('.');
                    return segments.some((_, index) =>
                        use.regex.test(segments.slice(index).join('.'))
                    );
                }
                return leaf.startsWith(prefix) && use.regex.test(leaf.slice(prefix.length));
            });
            return matches
                ? null
                : `no message matches ${use.text} under "${use.namespace ?? '*'}"`;
        }
        case 'unchecked':
            return null;
    }
}
