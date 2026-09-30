'use client';

import { cn } from '@rumtelo/utils';

import { useHouseholdShell } from '@/components/features/shell/household-shell-context';

export function ToastPill() {
    const { toast } = useHouseholdShell();

    if (!toast) return null;

    return (
        <div
            key={toast.id}
            role="status"
            aria-live="polite"
            data-testid="toast"
            className={cn(
                'fixed bottom-24 left-1/2 z-60 max-w-[calc(100vw-2rem)] -translate-x-1/2 animate-rise rounded-full border px-5 py-2.5 text-center text-sm font-medium text-balance shadow-lg',
                toast.type === 'success' && 'border-success bg-success/10 text-success',
                toast.type === 'error' && 'border-danger bg-danger/10 text-danger',
                toast.type === 'info' && 'border-fg-muted bg-surface text-fg'
            )}>
            {toast.message}
        </div>
    );
}
