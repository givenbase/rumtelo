import { type PlanKey, type SpendingStyle } from '@rumtelo/contracts';

/**
 * One row of the book shelf. The field names live here once;
 * the seed lists values, not the same keys a hundred times.
 */
export type BookPointer = {
    key: string;
    name: string;
    author: string;
    description: string;
    topic: string;
    minPlan: PlanKey;
    skill: string;
    spendingStyles: SpendingStyle[];
    coverId: number | null;
    isbn13: string;
    url: string;
};

export function book(
    key: string,
    name: string,
    author: string,
    description: string,
    topic: string,
    minPlan: PlanKey,
    skill: string,
    coverId: number | null,
    isbn13: string,
    url: string,
    spendingStyles: readonly SpendingStyle[] = []
): BookPointer {
    return {
        key,
        name,
        author,
        description,
        topic,
        minPlan,
        skill,
        spendingStyles: [...spendingStyles],
        coverId,
        isbn13,
        url,
    };
}
