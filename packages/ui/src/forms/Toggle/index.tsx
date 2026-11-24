'use client';

import { useId } from 'react';

import { cn } from '@rumtelo/utils';

import { Typography } from '../../display/Typography';
import { Label } from '../Label';

import type ToggleProps from './types';
import type { SwitchProps } from './types';

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

/**
 * The switch alone, for a row that already has its own label: pass `aria-labelledby` (or
 * `aria-label`). 24 px tall; the pseudo-element stretches the tap area to 44 px.
 */
export function Switch({ checked, onCheckedChange, disabled, className, ...aria }: SwitchProps) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => onCheckedChange?.(!checked)}
            className={cn(
                toggleTrackClass(checked),
                'mt-0 before:absolute before:-inset-2.5',
                className
            )}
            {...aria}>
            <span className={toggleThumbClass(checked)} aria-hidden />
        </button>
    );
}

export type { SwitchProps, ToggleProps };
