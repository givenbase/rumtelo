import {
    jarCapabilitiesFor,
    type JarKey,
    RuleField,
    RuleMatcher,
    TransactionStatus,
} from '@rumtelo/contracts';

import { matchMerchant } from '../../../../backoffice/product/money/preset/merchant/merchant.service';
import type { MerchantPreset } from '../../../../backoffice/product/money/preset/merchant/merchant.entity';
import { type Category } from '../plan/jar/category.entity';
import { type Jar } from '../plan/jar/jar.entity';
import { type SortRule } from './sort-rule/sort-rule.entity';

/**
 * One inbox row the auto-sorter may place.
 * `Transaction` satisfies this; dry-run previews pass plain objects so nothing is persisted.
 */
export type AutoSortRow = {
    amount: number;
    description: string;
    counterparty: string | null;
    status: TransactionStatus;
    jar: Jar | null;
    category: Category | null;
    appliedRule: string | null;
    appliedMerchantKey: string | null;
};

export type AutoSortContext = {
    /** Active household rules, priority ascending, jar + category populated. */
    rules: SortRule[];
    /** Active merchants for the household's market, matching + templates populated. */
    merchants: MerchantPreset[];
    jarsByKey: Map<JarKey, Jar>;
    /** Live (not archived) categories, keyed by parent jar id, names lower-cased. */
    categoryByJarAndName: Map<string, Map<string, Category>>;
};

/**
 * Place inbox rows: household rules first (priority order, first match wins),
 * then the merchant catalog. A merchant whose jar cannot take an outflow
 * (Financial Freedom) is skipped — the row stays in the inbox.
 *
 * Mutates the rows. Increments `rule.hitCount` only when `countHits` is set,
 * so a dry-run preview does not teach the rules they fired.
 */
export function autoSortRows(
    rows: AutoSortRow[],
    context: AutoSortContext,
    options?: { countHits?: boolean }
): number {
    let sorted = 0;
    for (const row of rows) {
        if (row.status !== TransactionStatus.INBOX || row.jar) continue;

        const rule = context.rules.find(candidate =>
            ruleMatches(candidate, fieldValue(row, candidate.field))
        );
        if (rule) {
            row.jar = rule.jar;
            row.category = rule.category;
            row.status = TransactionStatus.SORTED;
            row.appliedRule = rule.id;
            row.appliedMerchantKey = null;
            if (options?.countHits) rule.hitCount += 1;
            sorted += 1;
            continue;
        }

        const merchant = matchMerchant(context.merchants, {
            text: `${row.counterparty ?? ''} ${row.description}`,
        });
        if (!merchant) continue;
        const jarKey = merchant.jarTemplate.key;
        const jar = context.jarsByKey.get(jarKey);
        if (!jar) continue;
        if (row.amount < 0 && !jarCapabilitiesFor(jarKey).canSpend) continue;

        const categoryName = merchant.categoryTemplate.name.trim().toLowerCase();
        row.jar = jar;
        row.category = context.categoryByJarAndName.get(jar.id)?.get(categoryName) ?? null;
        row.status = TransactionStatus.SORTED;
        row.appliedRule = null;
        row.appliedMerchantKey = merchant.key;
        sorted += 1;
    }
    return sorted;
}

export function categoryIndex(categories: Category[]): Map<string, Map<string, Category>> {
    const index = new Map<string, Map<string, Category>>();
    for (const category of categories) {
        if (category.isArchived) continue;
        const jarId = category.jar?.id;
        if (!jarId) continue;
        const byName = index.get(jarId) ?? new Map<string, Category>();
        byName.set(category.name.trim().toLowerCase(), category);
        index.set(jarId, byName);
    }
    return index;
}

/** First match wins, in the caller's priority order. */
export function ruleMatches(rule: SortRule, value: string): boolean {
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

export function fieldValue(
    row: Pick<AutoSortRow, 'counterparty' | 'description' | 'amount'>,
    field: RuleField
): string {
    switch (field) {
        case RuleField.COUNTERPARTY:
            return row.counterparty ?? '';
        case RuleField.AMOUNT:
            return String(row.amount);
        case RuleField.DESCRIPTION:
        default:
            return row.description;
    }
}
