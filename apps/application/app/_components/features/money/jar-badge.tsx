import type { ReactNode } from 'react';

import { cn } from '@rumtelo/utils';

import { jarIcon } from '@/app/_lib/jar-meta';

type JarMarkProps = {
    jarKey?: string | null;
    /** Catalog / household icon; falls back to jar seed emoji. */
    icon?: string | null;
    className?: string;
};

/**
 * Jar identity on flat chrome — icon only.
 * Tiny color dots are too close (esp. Freedom vs Education teal) and double the noise next to emoji.
 * Use full jar color on larger surfaces (cards, meters), not in filter chips.
 */
export function JarMark({ jarKey, icon, className }: JarMarkProps) {
    return (
        <span className={cn('text-[13px] leading-none', className)} aria-hidden>
            {jarIcon(jarKey, icon)}
        </span>
    );
}

type JarBadgeProps = {
    jarKey?: string | null;
    name?: string | null;
    icon?: string | null;
    className?: string;
};

/** Jar pill — icon + name (color lives on jar cards / accents, not as a micro-dot). */
export function JarBadge({ jarKey, name, icon, className }: JarBadgeProps) {
    const label = name?.trim();
    if (!label) return null;

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface px-2 py-0.5 font-mono text-[10px] font-medium tracking-wide text-fg-secondary uppercase',
                className
            )}>
            <JarMark jarKey={jarKey} icon={icon} />
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
    t: (key: string, values?: Record<string, string | number>) => string,
    cadence?: string | null,
    dueMonth?: number | null
): string | null {
    if (dueDay === null || dueDay === undefined) return null;
    if (cadence === 'WEEKLY' && dueDay >= 1 && dueDay <= 7) {
        const weekday = t(`due_weekday_${dueDay}`);
        return t('due_day_weekly', { weekday });
    }
    if (
        cadence === 'QUARTERLY' &&
        dueMonth !== null &&
        dueMonth !== undefined &&
        dueMonth >= 1 &&
        dueMonth <= 3
    ) {
        return t('due_day_quarterly', {
            day: dueDay,
            month: t(`due_quarter_${dueMonth}`),
        });
    }
    if (
        cadence === 'YEARLY' &&
        dueMonth !== null &&
        dueMonth !== undefined &&
        dueMonth >= 1 &&
        dueMonth <= 12
    ) {
        return t('due_day_yearly', {
            day: dueDay,
            month: t(`due_month_${dueMonth}`),
        });
    }
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
