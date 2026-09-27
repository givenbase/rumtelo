/**
 * Shared control chrome for Input / Select / Textarea / Phone / Password.
 * Keep tokens aligned so composed controls (affixes, phone dialer) match.
 */

const FOCUS =
    'outline-none transition-colors focus:border-accent focus-visible:border-accent ' +
    'focus-visible:ring-2 focus-visible:ring-accent/35';

/** Standalone control — full border + fill (Input without affixes, Textarea, Select). */
export const controlClasses =
    'h-11 w-full rounded-lg border border-line-strong bg-surface px-3 text-sm text-fg shadow-sm ' +
    'placeholder:text-fg-muted ' +
    FOCUS +
    ' disabled:cursor-not-allowed disabled:opacity-60';

/** Outer shell when Input has startAffix / endAction (or date picker). */
export const fieldWrapperClasses =
    'relative flex h-11 w-full min-w-0 items-center rounded-lg border border-line-strong bg-surface shadow-sm ' +
    'transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/35 ' +
    'disabled:cursor-not-allowed disabled:opacity-60';

/** Native input inside an affix shell — no own border. */
export const fieldControlClasses =
    'h-full min-w-0 flex-1 border-none bg-transparent px-3 text-sm text-fg ' +
    'placeholder:text-fg-muted outline-none ' +
    'disabled:cursor-not-allowed';

export const startAffixClasses =
    'flex max-w-[min(52%,12rem)] shrink-0 items-center self-stretch border-r border-line-strong ' +
    'bg-raised/80 px-3 text-xs font-medium tracking-tight text-fg-muted select-none';

export const endActionClasses =
    'flex shrink-0 items-center self-stretch border-l border-line-strong bg-raised/60 pr-1';

export default controlClasses;
