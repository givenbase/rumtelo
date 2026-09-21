'use client';

import * as React from 'react';
import { useState } from 'react';

import { EyeIcon, EyeOffIcon } from 'lucide-react';

import { Input, type InputProps } from '../Input';

export type PasswordProps = Omit<InputProps, 'type' | 'endAction'> & {
    /**
     * When false, hides the show/hide control (rare).
     * @default true
     */
    showToggle?: boolean;
};

/**
 * Password field with show/hide — same chrome as {@link Input}.
 * Prefer this over raw `<Input type="password">` on auth forms.
 */
const Password = React.forwardRef<HTMLInputElement, PasswordProps>(
    ({ showToggle = true, disabled, readOnly, autoComplete, ...props }, ref) => {
        const [visible, setVisible] = useState(false);

        return (
            <Input
                {...props}
                ref={ref}
                type={visible ? 'text' : 'password'}
                disabled={disabled}
                readOnly={readOnly}
                autoComplete={autoComplete}
                endAction={
                    showToggle ? (
                        <button
                            type="button"
                            className="inline-flex size-8 items-center justify-center rounded-md text-fg-muted transition-colors hover:text-fg disabled:opacity-50"
                            title={visible ? 'Hide password' : 'Show password'}
                            aria-label={visible ? 'Hide password' : 'Show password'}
                            disabled={disabled}
                            onClick={() => setVisible(previous => !previous)}>
                            {visible ? (
                                <EyeOffIcon className="size-4" aria-hidden />
                            ) : (
                                <EyeIcon className="size-4" aria-hidden />
                            )}
                        </button>
                    ) : undefined
                }
            />
        );
    }
);
Password.displayName = 'Password';

export { Password };
