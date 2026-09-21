/**
 * Shared control chrome for Input / Select / Textarea / Phone / Password.
 * Keep tokens aligned so composed controls (affixes, phone dialer) match.
 */

/** Standalone control — full border + fill (Input without affixes, Textarea, Select). */
export const controlClasses =
    'h-11 w-full rounded-lg border border-line bg-raised px-3 text-sm text-fg ' +
    'placeholder:text-fg-faint transition-colors focus:border-accent focus:outline-none ' +
    'disabled:cursor-not-allowed disabled:opacity-60';

/** Outer shell when Input has startAffix / endAction (or date picker). */
export const fieldWrapperClasses =
    'relative flex h-11 w-full min-w-0 items-center rounded-lg border border-line bg-raised ' +
    'transition-colors focus-within:border-accent ' +
    'disabled:cursor-not-allowed disabled:opacity-60';

/** Native input inside an affix shell — no own border. */
export const fieldControlClasses =
    'h-full min-w-0 flex-1 border-none bg-transparent px-3 text-sm text-fg ' +
    'placeholder:text-fg-faint outline-none ' +
    'disabled:cursor-not-allowed';

export const startAffixClasses =
    'flex max-w-[min(52%,12rem)] shrink-0 items-center self-stretch border-r border-line ' +
    'bg-surface/80 px-3 text-xs font-medium tracking-tight text-fg-muted select-none';

export const endActionClasses =
    'flex shrink-0 items-center self-stretch border-l border-line bg-surface/60 pr-1';

export default controlClasses;
