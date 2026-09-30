'use client';

import PhoneInput, { type Country, type Value } from 'react-phone-number-input';

import { cn } from '@rumtelo/utils';

import 'react-phone-number-input/style.css';

import { fieldWrapperClasses } from '../Input/styles';

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
 * International phone field — stores E.164.
 * Prefer this over raw `<Input type="tel">` everywhere phones are collected.
 */
export function Phone({ className, defaultCountry = 'NL', onChange, value, ...props }: PhoneProps) {
    return (
        <PhoneInput
            className={cn(
                fieldWrapperClasses,
                'gap-0 overflow-hidden p-0',
                // Country dial — branded strip, not the library default chrome.
                '[&_.PhoneInputCountry]:flex [&_.PhoneInputCountry]:h-full [&_.PhoneInputCountry]:shrink-0',
                '[&_.PhoneInputCountry]:items-center [&_.PhoneInputCountry]:gap-1.5',
                '[&_.PhoneInputCountry]:border-r [&_.PhoneInputCountry]:border-line-strong',
                '[&_.PhoneInputCountry]:bg-raised/80 [&_.PhoneInputCountry]:px-2.5',
                '[&_.PhoneInputCountryIcon]:overflow-hidden [&_.PhoneInputCountryIcon]:rounded-sm',
                '[&_.PhoneInputCountrySelect]:absolute [&_.PhoneInputCountrySelect]:inset-0',
                '[&_.PhoneInputCountrySelect]:z-10 [&_.PhoneInputCountrySelect]:h-full [&_.PhoneInputCountrySelect]:w-full',
                '[&_.PhoneInputCountrySelect]:cursor-pointer [&_.PhoneInputCountrySelect]:opacity-0',
                '[&_.PhoneInputCountrySelectArrow]:text-fg-muted [&_.PhoneInputCountrySelectArrow]:opacity-70',
                // Number input
                '[&_.PhoneInputInput]:h-11 [&_.PhoneInputInput]:min-w-0 [&_.PhoneInputInput]:flex-1',
                '[&_.PhoneInputInput]:border-none [&_.PhoneInputInput]:bg-transparent',
                '[&_.PhoneInputInput]:px-3 [&_.PhoneInputInput]:font-mono [&_.PhoneInputInput]:text-sm',
                '[&_.PhoneInputInput]:tracking-wide [&_.PhoneInputInput]:text-fg [&_.PhoneInputInput]:tabular-nums',
                '[&_.PhoneInputInput]:outline-none [&_.PhoneInputInput]:placeholder:font-sans',
                '[&_.PhoneInputInput]:placeholder:tracking-normal [&_.PhoneInputInput]:placeholder:text-fg-muted',
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
