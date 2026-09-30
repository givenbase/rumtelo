'use client';

import { type ReactNode, type RefObject, useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@rumtelo/utils';

export type SuggestionPanelProps = {
    anchorRef: RefObject<HTMLElement | null>;
    open: boolean;
    onClose: () => void;
    id?: string;
    children: ReactNode;
    className?: string;
    /** Tailwind max-height utility — default `max-h-72`. */
    maxHeightClassName?: string;
};

/**
 * Portaled suggestion list under an anchor — escapes sheet/dialog overflow.
 * Rumtelo surface chrome (not inverted). Escape + outside click dismiss.
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
    const [box, setBox] = useState<{ top: number; left: number; width: number } | null>(null);

    useLayoutEffect(() => {
        if (!open) return;

        function update() {
            const el = anchorRef.current;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            setBox({
                top: rect.bottom + 6,
                left: rect.left,
                width: rect.width,
            });
        }

        update();
        window.addEventListener('resize', update);
        window.addEventListener('scroll', update, true);
        return () => {
            window.removeEventListener('resize', update);
            window.removeEventListener('scroll', update, true);
        };
    }, [open, anchorRef]);

    useEffect(() => {
        if (!open) return;

        function onPointerDown(event: MouseEvent) {
            const target = event.target as Node;
            if (anchorRef.current?.contains(target)) return;
            if (id) {
                const panel = document.getElementById(id);
                if (panel?.contains(target)) return;
            }
            onClose();
        }
        function onKey(event: KeyboardEvent) {
            if (event.key === 'Escape') onClose();
        }
        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open, onClose, anchorRef, id]);

    if (!open || !box || typeof document === 'undefined') return null;

    return createPortal(
        <div
            id={id}
            role="listbox"
            data-slot="suggestion-panel"
            style={{
                position: 'fixed',
                top: box.top,
                left: box.left,
                width: Math.max(box.width, 12 * 16),
                zIndex: 70,
            }}
            className={cn(
                'animate-rise overflow-auto rounded-xl border border-line bg-surface py-1.5 text-sm text-fg',
                'shadow-[0_18px_50px_-28px_rgba(15,23,42,0.45)] ring-1 ring-black/[0.03]',
                maxHeightClassName,
                className
            )}>
            {children}
        </div>,
        document.body
    );
}

/** Shared row chrome for suggestion options. */
export const suggestionOptionClass =
    'flex w-full items-center gap-2 px-3 py-2 text-left text-fg transition-colors hover:bg-accent-soft hover:text-accent';

export const suggestionGroupClass =
    'px-3 pt-2.5 pb-1 font-mono text-[10px] font-semibold tracking-[0.14em] text-fg-faint uppercase';

export const suggestionMutedClass = 'text-fg-muted';
