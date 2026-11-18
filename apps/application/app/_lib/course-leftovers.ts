import { CourseItemStatus, type CourseItem } from '@rumtelo/contracts';

const UNFINISHED = new Set<CourseItemStatus>([
    CourseItemStatus.OPEN,
    CourseItemStatus.PARTIAL,
    CourseItemStatus.MISSED,
]);

/** Still open: not done, not let go, not already moved on. */
export function isUnfinished(item: CourseItem): boolean {
    return UNFINISHED.has(item.status);
}

/**
 * Open items of `previous` that were not carried into `current`.
 * Shared by the Course leftover banner (looking back) and Schedule › Next week (looking ahead).
 */
export function leftoverItems(
    previous: readonly CourseItem[],
    current: readonly CourseItem[]
): CourseItem[] {
    const carriedFrom = new Set(
        current.map(item => item.carriedFromId).filter((id): id is string => Boolean(id))
    );
    return previous.filter(item => item.canEdit && isUnfinished(item) && !carriedFrom.has(item.id));
}
