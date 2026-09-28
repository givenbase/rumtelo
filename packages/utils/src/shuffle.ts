/**
 * Fisher–Yates shuffle into a new array. Does not mutate the input.
 * Optional `random` for tests (defaults to Math.random).
 */
export function shuffled<T>(items: readonly T[], random: () => number = Math.random): T[] {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i -= 1) {
        const j = Math.floor(random() * (i + 1));
        const a = out[i]!;
        out[i] = out[j]!;
        out[j] = a;
    }
    return out;
}
