'use client';

import { Typography } from '../../display/Typography';

import type FieldProps from './types';

export function Field({ label, hint, children, htmlFor }: FieldProps) {
    return (
        <div className="grid gap-1.5">
            <label htmlFor={htmlFor} className="text-sm font-medium text-fg">
                {label}
            </label>
            {children}
            {hint ? (
                <Typography as="p" variant="caption">
                    {hint}
                </Typography>
            ) : null}
        </div>
    );
}

export type { FieldProps };
