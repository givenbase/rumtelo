import type { ReactNode } from 'react';

import { cn } from '@rumtelo/utils';

import { bgClassToCssVar } from '@/app/_lib/jar-chrome';
import { jarChrome } from '@/app/_lib/jar-meta';

type JarBadgeProps = {
    jarKey?: string | null;
    name?: string | null;
    className?: string;
};

/** Colored jar pill — used on lists so the destination is scannable, not flat text. */
export function JarBadge({ jarKey, name, className }: JarBadgeProps) {
    const label = name?.trim();
    if (!label) return null;
    const chrome = jarChrome(jarKey);

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full border border-line bg-raised px-2 py-0.5 font-mono text-[10px] font-medium tracking-wide text-fg-secondary uppercase',
                className
            )}>
            <span
                className="size-1.75 shrink-0 rounded-sm"
                style={{
                    background: jarKey ? bgClassToCssVar(chrome.color) : 'var(--color-fg-faint)',
                }}
                aria-hidden
            />
            {label}
        </span>
    );
}

export function MetaChip({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full border border-line bg-surface px-2 py-0.5 font-mono text-[10px] font-medium tracking-wide text-fg-muted uppercase',
                className
            )}>
            {children}
        </span>
    );
}

export function formatDueDay(
    dueDay: number | null | undefined,
    t: (key: string, values?: Record<string, string | number>) => string
): string | null {
    if (dueDay === null || dueDay === undefined) return null;
    return t('due_day', { day: dueDay });
}

/** ISO `YYYY-MM-DD` → short date, UTC so bookedOn does not shift. */
export function formatBookedDate(iso: string, locale: string): string {
    const [year, month, day] = iso.split('-').map(Number);
    if (!year || !month || !day) return iso;
    return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(locale, {
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
    });
}
