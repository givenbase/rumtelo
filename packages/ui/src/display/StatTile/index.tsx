'use client';

import { cn } from '@rumtelo/utils';

import type StatTileProps from './types';

import { Typography, typographyVariants } from '../Typography';
import { Eyebrow } from '../../layout/Eyebrow';

/** Headline figure with tabular numbers. */
export function StatTile({ label, value, hint, tone = 'default' }: StatTileProps) {
    return (
        <div className="rounded-lg border border-line bg-surface p-4">
            <Eyebrow>{label}</Eyebrow>
            <p
                className={cn(
                    typographyVariants({ as: 'h2', weight: 'semibold', color: 'default' }),
                    'mt-2 tabular-nums',
                    tone === 'positive' && 'text-success',
                    tone === 'negative' && 'text-danger'
                )}>
                {value}
            </p>
            {hint ? (
                <Typography as="span" variant="caption" className="mt-1 block">
                    {hint}
                </Typography>
            ) : null}
        </div>
    );
}

export type { StatTileProps };
