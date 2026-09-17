'use client';

import { Typography } from '../../display/Typography';

import type ToggleProps from './types';

import { toggleThumbClass, toggleTrackClass } from './styles';

export function Toggle({ checked, label, hint, onCheckedChange, disabled }: ToggleProps) {
    return (
        <div className="flex items-start justify-between gap-4 py-3">
            <div className="min-w-0">
                <p className="text-sm font-medium text-fg">{label}</p>
                {hint ? (
                    <Typography as="p" variant="caption" className="mt-0.5">
                        {hint}
                    </Typography>
                ) : null}
            </div>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                aria-label={label}
                disabled={disabled}
                onClick={() => onCheckedChange?.(!checked)}
                className={toggleTrackClass(checked)}>
                <span className={toggleThumbClass(checked)} />
            </button>
        </div>
    );
}

export type { ToggleProps };
