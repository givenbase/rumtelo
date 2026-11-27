/**
 * A category belongs to exactly one pot, and the server refuses one that is not in the pot it is
 * saved with (`category_not_found`). Forms that prefill a category from a link, a stored row or a
 * pot fallback call this before they keep it: the id survives only when it is one of the pot's
 * categories; otherwise it is dropped (`null`) and the form re-derives a category for the new pot.
 *
 * `categories` is `undefined` while the pot's balances are still loading — the id is kept then,
 * so a slow query never wipes a valid prefill.
 */
export function categoryIdInJar(
    categoryId: string | null | undefined,
    categories: readonly { id: string }[] | undefined
): string | null {
    if (!categoryId) return null;
    if (!categories) return categoryId;
    return categories.some(category => category.id === categoryId) ? categoryId : null;
}
