'use client';

import { useCallback, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

type RouteModalShellProps = {
    children: React.ReactNode;
    closeHref?: string;
    /** Push closeHref on dismiss (direct URL entry). Default uses router.back() for intercept. */
    closeWithHref?: boolean;
    description?: string;
    /** Controlled dismiss override — skips router.back / closeHref. */
    onDismiss?: () => void;
    title: string;
    width?: 'default' | 'wide';
};

/**
 * Shared overlay for create/edit via Next.js intercepting routes.
 * Soft nav → this sheet over the list. Hard refresh → full page (no shell).
 * Dismiss / success default: router.back() — Galighticus AdminRouteModalShell pattern.
 */
export function RouteModalShell({
    children,
    closeHref,
    closeWithHref = false,
    description,
    onDismiss,
    title,
    width = 'default',
}: RouteModalShellProps) {
    const router = useRouter();
    const [open, setOpen] = useState(true);
    const isClosingRef = useRef(false);

    const performClose = useCallback(() => {
        if (isClosingRef.current) return;
        isClosingRef.current = true;
        setOpen(false);

        window.setTimeout(() => {
            if (onDismiss) {
                onDismiss();
                return;
            }
            if (closeWithHref && closeHref) {
                router.push(closeHref);
                return;
            }
            // Soft intercept: prefer history. If no history (rare), land on list.
            if (typeof window !== 'undefined' && window.history.length > 1) {
                router.back();
                return;
            }
            if (closeHref) {
                router.push(closeHref);
                return;
            }
            router.back();
        }, 180);
    }, [closeHref, closeWithHref, onDismiss, router]);

    return (
        <Sheet
            open={open}
            onOpenChange={nextOpen => {
                if (!nextOpen) performClose();
            }}>
            <SheetContent
                side="right"
                showCloseButton
                className={cn(
                    'flex flex-col gap-0 overflow-hidden border-line bg-surface p-0 shadow-xl',
                    // Overrides the Sheet default (sm:max-w-lg). Forms need room for
                    // two-column rows and long select labels.
                    width === 'wide' ? 'sm:max-w-2xl' : 'sm:max-w-xl'
                )}>
                <SheetHeader className="shrink-0 space-y-0 border-b border-line bg-raised px-5 py-4 pr-12 text-left">
                    <div className="space-y-1">
                        <SheetTitle>{title}</SheetTitle>
                        {description ? <SheetDescription>{description}</SheetDescription> : null}
                    </div>
                </SheetHeader>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">
                    {children}
                </div>
            </SheetContent>
        </Sheet>
    );
}
