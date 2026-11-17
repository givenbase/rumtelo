/**
 * Quick add › Add: which kinds the list offers, by board stage (CL-13).
 *
 * Week 1 offers four kinds. The rest join with the stage, but a kind the stage keeps out
 * of the default list is still found when typed ("hidden is not removed"). Plan badges
 * stay as they were; a plan-locked kind above the stage is never offered (no new upsell).
 */
import type { IconName } from '@rumtelo/ui';

import { BoardStage, stageAtLeast } from './board-stage';
import type { CreateKind } from './create-routes';
import type { DeferredUntil } from './nav';

export type QuickAddItem = {
    labelKey: string;
    kind: CreateKind;
    /** Extra words the filter matches. */
    search: string;
    icon: IconName;
    /** The stage whose default list carries this kind. */
    fromStage: BoardStage;
    /** Product that must be launched (`isProductEnabled`); never offered when it is not. */
    product?: 'energy';
};

export const QUICK_ITEMS: readonly QuickAddItem[] = [
    {
        labelKey: 'pages.shell.quick_add.transaction',
        kind: 'tx',
        search: 'transaction expense',
        icon: 'receipt',
        fromStage: BoardStage.SPLIT,
    },
    {
        labelKey: 'pages.shell.quick_add.import_statement',
        kind: 'importStatement',
        search: 'import statement bank camt mt940 csv afschrift',
        icon: 'upload',
        fromStage: BoardStage.SPLIT,
    },
    {
        labelKey: 'pages.shell.quick_add.fixed_cost',
        kind: 'fixed',
        search: 'fixed cost bill rent huur',
        icon: 'calendar-clock',
        fromStage: BoardStage.SPLIT,
    },
    {
        labelKey: 'pages.shell.quick_add.income',
        kind: 'income',
        search: 'income',
        icon: 'wallet',
        fromStage: BoardStage.SPLIT,
    },
    {
        labelKey: 'pages.shell.quick_add.goal',
        kind: 'goal',
        search: 'goal',
        icon: 'target',
        fromStage: BoardStage.ROUTINE,
    },
    {
        labelKey: 'pages.shell.quick_add.move_money',
        kind: 'move',
        search: 'move jar',
        icon: 'arrow-left-right',
        fromStage: BoardStage.ROUTINE,
    },
    {
        labelKey: 'pages.shell.quick_add.debt',
        kind: 'debt',
        search: 'debt',
        icon: 'credit-card',
        fromStage: BoardStage.MONTH,
    },
    {
        labelKey: 'pages.shell.quick_add.asset',
        kind: 'asset',
        search: 'asset',
        icon: 'landmark',
        fromStage: BoardStage.MONTH,
    },
    {
        labelKey: 'pages.shell.quick_add.training',
        kind: 'session',
        search: 'training sport',
        icon: 'dumbbell',
        fromStage: BoardStage.MONTH,
        product: 'energy',
    },
];

export type QuickAddHit = { item: QuickAddItem; deferredUntil?: DeferredUntil };

export type QuickAddInput = {
    stage: BoardStage;
    /** False while the stage read is in flight: the list shows the week-1 kinds. */
    stageReady: boolean;
    /** The typed filter, trimmed and lower-cased. */
    query: string;
    /** `isProductEnabled`. */
    productEnabled: (product: string) => boolean;
    /** True when the plan lacks the kind's capability. */
    isLocked: (kind: CreateKind) => boolean;
    /** Translated label of an item. */
    labelOf: (item: QuickAddItem) => string;
};

/** The default list (no filter) or the typed matches, in menu order. */
export function quickAddHits(input: QuickAddInput): QuickAddHit[] {
    const listStage = input.stageReady ? input.stage : BoardStage.SPLIT;
    const launched = QUICK_ITEMS.filter(
        item => !item.product || input.productEnabled(item.product)
    );

    if (!input.query) {
        return launched
            .filter(item => stageAtLeast(listStage, item.fromStage))
            .map(item => ({ item }));
    }

    const hits: QuickAddHit[] = [];
    for (const item of launched) {
        const matches =
            input.labelOf(item).toLowerCase().includes(input.query) ||
            item.search.includes(input.query);
        if (!matches) continue;
        if (stageAtLeast(listStage, item.fromStage)) {
            hits.push({ item });
        } else if (!input.isLocked(item.kind)) {
            hits.push({
                item,
                deferredUntil: item.fromStage === BoardStage.ROUTINE ? 'week_check' : 'month_close',
            });
        }
    }
    return hits;
}
