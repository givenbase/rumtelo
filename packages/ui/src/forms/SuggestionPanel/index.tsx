'use client';

import { type ReactNode, type RefObject } from 'react';

import { cn } from '@rumtelo/utils';

import { Popover as PopoverPrimitive } from 'radix-ui';

export type SuggestionPanelProps = {
    anchorRef: RefObject<HTMLElement | null>;
    open: boolean;
    onClose: () => void;
    id?: string;
    children: ReactNode;
    className?: string;
    /**
     * Preferred max height before Popper collision clamp.
     * @default `max-h-72` (18rem)
     */
    maxHeightClassName?: 'max-h-64' | 'max-h-72';
};

const PREFERRED_MAX_HEIGHT: Record<
    NonNullable<SuggestionPanelProps['maxHeightClassName']>,
    string
> = {
    'max-h-64': '16rem',
    'max-h-72': '18rem',
};

/**
 * Portaled suggestion list under an anchor — same stack as shadcn Combobox:
 * Radix Popover (`modal`) → Portal + RemoveScroll + collision / available-height.
 * Keeps focus on the input (`onOpenAutoFocus` prevented).
 */
export function SuggestionPanel({
    anchorRef,
    open,
    onClose,
    id,
    children,
    className,
    maxHeightClassName = 'max-h-72',
}: SuggestionPanelProps) {
    const preferredMax = PREFERRED_MAX_HEIGHT[maxHeightClassName];

    return (
        <PopoverPrimitive.Root
            modal
            open={open}
            onOpenChange={nextOpen => {
                if (!nextOpen) onClose();
            }}>
            <PopoverPrimitive.Anchor virtualRef={anchorRef} />
            <PopoverPrimitive.Portal>
                <PopoverPrimitive.Content
                    id={id}
                    role="listbox"
                    data-slot="suggestion-panel"
                    side="bottom"
                    align="start"
                    sideOffset={6}
                    collisionPadding={12}
                    onOpenAutoFocus={event => event.preventDefault()}
                    onCloseAutoFocus={event => event.preventDefault()}
                    style={{
                        width: 'max(12rem, var(--radix-popper-anchor-width))',
                        maxHeight: `min(${preferredMax}, var(--radix-popper-available-height))`,
                    }}
                    className={cn(
                        'z-70 overflow-y-auto overscroll-contain rounded-xl border border-line bg-surface py-1.5 text-sm text-fg outline-hidden',
                        'shadow-[0_18px_50px_-28px_rgba(15,23,42,0.45)] ring-1 ring-black/[0.03]',
                        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
                        'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
                        'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
                        className
                    )}>
                    {children}
                </PopoverPrimitive.Content>
            </PopoverPrimitive.Portal>
        </PopoverPrimitive.Root>
    );
}

/** Shared row chrome for suggestion options. */
export const suggestionOptionClass =
    'flex w-full items-center gap-2 px-3 py-2 text-left text-fg transition-colors hover:bg-accent-soft hover:text-accent';

export const suggestionGroupClass =
    'px-3 pt-2.5 pb-1 font-mono text-[10px] font-semibold tracking-[0.14em] text-fg-faint uppercase';

export const suggestionMutedClass = 'text-fg-muted';
