import {
    JarKey,
    RuleField,
    RuleMatcher,
    type Jar,
    type MerchantPreset,
    type Rule,
    type Transaction,
} from '@rumtelo/contracts';

import { matchMerchantJarKey } from '@/app/_lib/merchant-match';

export type InboxSuggestConfidence = 'high' | 'low';

export type InboxSuggestion = {
    jarId: string | null;
    jarKey: JarKey | null;
    /** True only for rule / merchant / prior-payee hits — never the blind amount fallback. */
    confidence: InboxSuggestConfidence;
};

/** Normalize payee text for household memory lookup. */
export function payeeMemoryKey(
    transaction: Pick<Transaction, 'counterparty' | 'description'>
): string {
    const raw = (transaction.counterparty?.trim() || transaction.description).trim().toLowerCase();
    return raw.replace(/\s+/g, ' ');
}

/**
 * Last confirmed jar per payee from already-sorted ledger rows (newest first).
 * YNAB-style household memory without a separate payee table.
 */
export function buildPayeeJarMemory(
    sortedTransactions: readonly Transaction[]
): Map<string, string> {
    const memory = new Map<string, string>();
    for (const row of sortedTransactions) {
        if (!row.jarId) continue;
        const key = payeeMemoryKey(row);
        if (!key || memory.has(key)) continue;
        memory.set(key, row.jarId);
    }
    return memory;
}

function fieldValue(
    transaction: Pick<Transaction, 'counterparty' | 'description' | 'amount'>,
    field: RuleField
): string {
    switch (field) {
        case RuleField.COUNTERPARTY:
            return transaction.counterparty ?? '';
        case RuleField.AMOUNT:
            return String(transaction.amount);
        case RuleField.DESCRIPTION:
        default:
            return transaction.description;
    }
}

function ruleMatches(rule: Rule, value: string): boolean {
    const haystack = value.toLowerCase();
    const needle = rule.matchValue.toLowerCase();
    switch (rule.matcher) {
        case RuleMatcher.EQUALS:
            return haystack === needle;
        case RuleMatcher.STARTS_WITH:
            return haystack.startsWith(needle);
        case RuleMatcher.CONTAINS:
            return haystack.includes(needle);
        case RuleMatcher.REGEX:
            try {
                return new RegExp(rule.matchValue, 'i').test(value);
            } catch {
                return false;
            }
        default:
            return false;
    }
}

/** Active rules, priority ascending — first match wins (same as backend). */
export function matchRuleJarId(
    transaction: Pick<Transaction, 'counterparty' | 'description' | 'amount'>,
    rules: readonly Rule[]
): string | null {
    const active = rules
        .filter(rule => rule.isActive)
        .slice()
        .sort((left, right) => left.priority - right.priority);
    for (const rule of active) {
        if (!ruleMatches(rule, fieldValue(transaction, rule.field))) continue;
        return rule.jarId;
    }
    return null;
}

/** Soft amount guess for expenses only — never treated as confident. */
export function amountFallbackJarKey(amount: number): JarKey | null {
    if (amount > 0) return null;
    if (Math.abs(amount) < 2_000) return JarKey.PLAY;
    return JarKey.NECESSITIES;
}

/**
 * Inbox jar suggestion priority:
 * 1. Household rule
 * 2. Merchant catalog (outflows)
 * 3. Prior payee memory
 * 4. Weak amount fallback (outflows only)
 *
 * Income with no hit stays unmatched (caller soft-defaults UI without "vrij zeker").
 */
export function suggestInboxJar(input: {
    transaction: Transaction;
    jars: readonly Pick<Jar, 'id' | 'key'>[];
    merchants: readonly MerchantPreset[];
    rules: readonly Rule[];
    payeeMemory: ReadonlyMap<string, string>;
}): InboxSuggestion {
    const { transaction, jars, merchants, rules, payeeMemory } = input;
    const jarById = new Map(jars.map(jar => [jar.id, jar]));
    const jarByKey = new Map(jars.map(jar => [jar.key, jar]));

    function fromJarId(jarId: string | null | undefined): InboxSuggestion | null {
        if (!jarId) return null;
        const jar = jarById.get(jarId);
        if (!jar) return null;
        return { jarId: jar.id, jarKey: jar.key, confidence: 'high' };
    }

    function fromJarKey(jarKey: JarKey | null, confidence: InboxSuggestConfidence): InboxSuggestion {
        if (!jarKey) return { jarId: null, jarKey: null, confidence };
        const jar = jarByKey.get(jarKey);
        return {
            jarId: jar?.id ?? null,
            jarKey,
            confidence,
        };
    }

    const fromRule = fromJarId(matchRuleJarId(transaction, rules));
    if (fromRule) return fromRule;

    if (transaction.amount < 0) {
        const text = `${transaction.counterparty ?? ''} ${transaction.description}`;
        const merchantKey = matchMerchantJarKey(text, merchants);
        if (merchantKey) {
            const hit = fromJarKey(merchantKey, 'high');
            if (hit.jarId) return hit;
        }
    }

    const fromMemory = fromJarId(payeeMemory.get(payeeMemoryKey(transaction)));
    if (fromMemory) return fromMemory;

    const amountKey = amountFallbackJarKey(transaction.amount);
    if (amountKey) return fromJarKey(amountKey, 'low');

    return { jarId: null, jarKey: null, confidence: 'low' };
}
