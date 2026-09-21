'use client';

import * as React from 'react';

import { Input, type InputProps } from '../Input';

export type EmailProps = Omit<InputProps, 'type' | 'autoCapitalize' | 'inputMode' | 'spellCheck'>;

/** Strip spaces and lowercase — canonical form for storage / APIs. */
export function normalizeEmailValue(value: string): string {
    return value.replace(/\s+/g, '').toLowerCase();
}

/**
 * Email field — same chrome as {@link Input}, always `type="email"`.
 * Prefer this over raw `<Input type="email">` wherever email is collected.
 * Values are normalized (no spaces, lowercase) on change and blur.
 */
const Email = React.forwardRef<HTMLInputElement, EmailProps>(
    ({ autoComplete = 'email', onBlur, onChange, ...props }, ref) => {
        return (
            <Input
                ref={ref}
                autoCapitalize="none"
                autoComplete={autoComplete}
                autoCorrect="off"
                inputMode="email"
                spellCheck={false}
                type="email"
                onBlur={event => {
                    const normalized = normalizeEmailValue(event.target.value);
                    if (normalized !== event.target.value) {
                        event.target.value = normalized;
                        onChange?.(event);
                    }
                    onBlur?.(event);
                }}
                onChange={event => {
                    const cleaned = event.target.value.replace(/\s+/g, '');
                    if (cleaned !== event.target.value) {
                        event.target.value = cleaned;
                    }
                    onChange?.(event);
                }}
                {...props}
            />
        );
    }
);
Email.displayName = 'Email';

export { Email };
