'use client';

import type { ReactNode } from 'react';

import { Button } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

/**
 * One pot in a group's list, as a card: name and state, what it is for, what the button does,
 * and on the right its share (when the pot is on) and the on/off button (when it is optional).
 * Settings › Pots and the pots board both render this, so the two look and read the same.
 */
export function PotSplitCard({
    nameId,
    inputId,
    name,
    badge,
    purpose,
    effect,
    isOn,
    share,
    action,
}: {
    nameId: string;
    /** The share field this card's name labels, when it has one. */
    inputId?: string;
    name: string;
    /** "Always on", "On" or "Optional". */
    badge: string;
    purpose: string;
    /** What turning the pot on or off moves; none for a main pot. */
    effect?: string | null;
    isOn: boolean;
    /** The share field (and anything next to it, such as the amount); only when the pot is on. */
    share?: ReactNode;
    /** The on/off button of an optional pot; a main pot has none. */
    action?: {
        id: string;
        label: string;
        busy: boolean;
        disabled: boolean;
        onClick: () => void;
    } | null;
}) {
    return (
        <li
            className={cn(
                'flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border px-4 py-3',
                isOn ? 'border-accent/40 bg-accent-soft/40' : 'border-line bg-raised/40'
            )}>
            <div className="grid min-w-0 basis-full gap-0.5 sm:flex-1 sm:basis-0">
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    <label
                        id={nameId}
                        htmlFor={inputId}
                        className="min-w-0 text-sm font-medium break-words text-fg">
                        {name}
                    </label>
                    <span className="rounded-full border border-line bg-surface px-2 py-0.5 font-mono text-[11px] leading-snug whitespace-nowrap text-fg-muted">
                        {badge}
                    </span>
                </div>
                <p className="text-xs leading-snug text-fg-muted">{purpose}</p>
                {effect ? <p className="text-xs leading-snug text-fg-secondary">{effect}</p> : null}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2">
                {share}
                {action ? (
                    <Button
                        id={action.id}
                        type="button"
                        variant={isOn ? 'secondary' : 'primary'}
                        size="sm"
                        // The button's own text plus the pot name: "Turn off Daily".
                        aria-labelledby={`${action.id} ${nameId}`}
                        disabled={action.disabled}
                        aria-busy={action.busy}
                        className="min-h-11"
                        onClick={action.onClick}>
                        {action.label}
                    </Button>
                ) : null}
            </div>
        </li>
    );
}
