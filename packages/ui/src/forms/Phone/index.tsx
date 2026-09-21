'use client';

import PhoneInput, { type Country, type Value } from 'react-phone-number-input';

import { cn } from '@rumtelo/utils';

import 'react-phone-number-input/style.css';

import controlClasses from '../Input/styles';

export type PhoneProps = {
    className?: string;
    disabled?: boolean;
    id?: string;
    name?: string;
    /** Default country for the dial picker — Rumtelo is NL-first. */
    defaultCountry?: Country;
    placeholder?: string;
    autoComplete?: string;
    'aria-label'?: string;
    onBlur?: () => void;
    onChange: (value: string) => void;
    value: string;
};

/**
 * International phone field — stores E.164 (`+31614602535`).
 * Prefer this over raw `<Input type="tel">` everywhere phones are collected.
 */
export function Phone({ className, defaultCountry = 'NL', onChange, value, ...props }: PhoneProps) {
    return (
        <PhoneInput
            className={cn(
                controlClasses,
                'flex items-center gap-2 [&_.PhoneInputCountry]:shrink-0',
                '[&_.PhoneInputInput]:min-w-0 [&_.PhoneInputInput]:flex-1',
                '[&_.PhoneInputInput]:border-none [&_.PhoneInputInput]:bg-transparent',
                '[&_.PhoneInputInput]:p-0 [&_.PhoneInputInput]:text-sm [&_.PhoneInputInput]:text-fg',
                '[&_.PhoneInputInput]:outline-none [&_.PhoneInputInput]:placeholder:text-fg-faint',
                '[&_.PhoneInputCountrySelect]:bg-transparent [&_.PhoneInputCountrySelectArrow]:opacity-50',
                className
            )}
            international
            defaultCountry={defaultCountry}
            onChange={(next: Value) => {
                onChange(next ?? '');
            }}
            value={value || undefined}
            {...props}
        />
    );
}
