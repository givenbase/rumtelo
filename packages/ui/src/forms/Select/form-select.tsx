'use client';

import type { ReactNode } from 'react';

import { cn } from '@rumtelo/utils';

import { FormControl } from '../Form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './index';

/** Sentinel for “no selection” — Radix SelectItem cannot use `value=""`. */
export const FORM_SELECT_NONE = '__none__';

type FormSelectProps = {
    value: string;
    onValueChange: (value: string) => void;
    children: ReactNode;
    disabled?: boolean;
    /** When false, skip FormControl (standalone fields outside RHF FormField). */
    withFormControl?: boolean;
    size?: 'sm' | 'default';
    triggerClassName?: string;
    contentClassName?: string;
    'aria-label'?: string;
};

/**
 * Form-ready Radix select — use instead of native `<select>`.
 * Children should be {@link SelectItem} (or {@link FormSelectItem}).
 */
export function FormSelect({
    value,
    onValueChange,
    children,
    disabled,
    withFormControl = true,
    size = 'default',
    triggerClassName,
    contentClassName,
    'aria-label': ariaLabel,
}: FormSelectProps) {
    const trigger = (
        <SelectTrigger size={size} className={triggerClassName} aria-label={ariaLabel}>
            <SelectValue />
        </SelectTrigger>
    );

    return (
        <Select value={value} onValueChange={onValueChange} disabled={disabled}>
            {withFormControl ? <FormControl>{trigger}</FormControl> : trigger}
            <SelectContent
                position="popper"
                className={cn(
                    'rounded-lg border-line bg-surface text-fg shadow-md',
                    contentClassName
                )}>
                {children}
            </SelectContent>
        </Select>
    );
}

export { SelectItem as FormSelectItem };

/** Map null/empty → {@link FORM_SELECT_NONE} for Radix. */
export function toFormSelectValue(value: string | null | undefined): string {
    return value && value.length > 0 ? value : FORM_SELECT_NONE;
}

/** Map {@link FORM_SELECT_NONE} → null for nullable form fields. */
export function fromFormSelectValue(value: string): string | null {
    return value === FORM_SELECT_NONE ? null : value;
}
