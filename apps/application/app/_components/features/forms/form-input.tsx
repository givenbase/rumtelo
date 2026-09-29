'use client';

import * as React from 'react';

import { Input, type InputProps } from '@rumtelo/ui';

import { ignorePasswordManagers, safeAutofillName } from '@/app/_lib/ignore-password-managers';

/** Native temporal controls — skip readOnly-until-focus (blocks showPicker). */
const TEMPORAL_TYPES = new Set(['date', 'datetime-local', 'month', 'time', 'week']);

/**
 * Money-form text input — same as UI Input, but hard-discourages browser /
 * password-manager autofill (Chrome + LastPass ignore a plain autocomplete=off).
 */
export const FormInput = React.forwardRef<HTMLInputElement, InputProps>(function FormInput(
    { name, onFocus, type, readOnly, ...props },
    ref
) {
    const isTemporal = Boolean(type && TEMPORAL_TYPES.has(type));

    return (
        <Input
            ref={ref}
            type={type}
            {...props}
            name={safeAutofillName(name)}
            {...ignorePasswordManagers}
            readOnly={isTemporal ? readOnly : true}
            onFocus={event => {
                // Managers scan on paint; unlocking on focus stops most injections.
                if (!isTemporal) event.currentTarget.removeAttribute('readonly');
                onFocus?.(event);
            }}
        />
    );
});
