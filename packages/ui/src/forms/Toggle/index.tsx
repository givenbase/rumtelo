'use client';

import { useId } from 'react';

import { Typography } from '../../display/Typography';
import { Label } from '../Label';

import type ToggleProps from './types';

import { toggleThumbClass, toggleTrackClass } from './styles';

export function Toggle({ checked, label, hint, onCheckedChange, disabled }: ToggleProps) {
    const switchId = useId();
    const labelId = `${switchId}-label`;
    const hintId = hint ? `${switchId}-hint` : undefined;

    return (
        <div className="flex items-start justify-between gap-4 py-3">
            <div className="min-w-0">
                <Label
                    id={labelId}
                    htmlFor={switchId}
                    className="cursor-pointer items-start leading-snug text-fg">
                    {label}
                </Label>
                {hint ? (
                    <Typography as="p" variant="caption" className="mt-0.5" id={hintId}>
                        {hint}
                    </Typography>
                ) : null}
            </div>
            <button
                id={switchId}
                type="button"
                role="switch"
                aria-checked={checked}
                aria-labelledby={labelId}
                aria-describedby={hintId}
                disabled={disabled}
                onClick={() => onCheckedChange?.(!checked)}
                className={toggleTrackClass(checked)}>
                <span className={toggleThumbClass(checked)} aria-hidden />
            </button>
        </div>
    );
}

export type { ToggleProps };
