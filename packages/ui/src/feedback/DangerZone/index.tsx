'use client';

import type DangerZoneProps from './types';

export function DangerZone({ title, body, action, onAction, disabled }: DangerZoneProps) {
    return (
        <div className="rounded-lg border border-danger bg-danger/5 p-5">
            <p className="font-semibold text-danger">{title}</p>
            <p className="mt-1 text-sm text-fg-secondary">{body}</p>
            <button
                type="button"
                disabled={disabled}
                onClick={onAction}
                className="mt-4 h-10 rounded-lg border border-danger px-4 text-sm font-semibold text-danger transition-colors hover:bg-danger hover:text-on-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger disabled:cursor-not-allowed disabled:opacity-50">
                {action}
            </button>
        </div>
    );
}

export type { DangerZoneProps };
