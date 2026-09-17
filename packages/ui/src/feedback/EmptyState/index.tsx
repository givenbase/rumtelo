'use client';

import { Typography } from '../../display/Typography';

import type EmptyStateProps from './types';

export function EmptyState({ icon, title, body, action }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center rounded-lg border border-line bg-surface px-6 py-12 text-center">
            <span className="text-3xl">{icon}</span>
            <Typography as="h3" className="mt-3">
                {title}
            </Typography>
            <Typography as="p" size="sm" color="muted" className="mt-1 max-w-sm">
                {body}
            </Typography>
            {action ? <div className="mt-4">{action}</div> : null}
        </div>
    );
}

export type { EmptyStateProps };
