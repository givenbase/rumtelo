const WORD_CHAR = /[\p{L}\p{N}]/u;

/**
 * Case-insensitive needle match that respects word edges on the needle's own
 * letter/digit ends — the shared first-pass matcher for merchant needles.
 *
 * `ns` matches "NS GROEP" but not "belastingdienst"; `ing` does not hit "booking";
 * `microsoft*` still matches "MICROSOFT*XBOX" because `*` is not a word char.
 */
export function containsWord(text: string, needle: string): boolean {
    const haystack = text.toLowerCase();
    const term = needle.trim().toLowerCase();
    if (!term) return false;
    let from = 0;
    while (from <= haystack.length - term.length) {
        const at = haystack.indexOf(term, from);
        if (at === -1) return false;
        const before = haystack[at - 1];
        const after = haystack[at + term.length];
        const startOk = !WORD_CHAR.test(term.charAt(0)) || !before || !WORD_CHAR.test(before);
        const endOk = !WORD_CHAR.test(term.slice(-1)) || !after || !WORD_CHAR.test(after);
        if (startOk && endOk) return true;
        from = at + 1;
    }
    return false;
}
