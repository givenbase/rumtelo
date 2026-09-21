'use client';

import * as React from 'react';
import { useState } from 'react';

import { EyeIcon, EyeOffIcon } from 'lucide-react';

import { cn } from '@rumtelo/utils';

import controlClasses from '../Input/styles';

export type PasswordProps = React.InputHTMLAttributes<HTMLInputElement> & {
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
    (
        { className, showToggle = true, disabled, readOnly, autoComplete, type: _type, ...props },
        ref
    ) => {
        const [visible, setVisible] = useState(false);

        return (
            <div className={cn('relative w-full', className)}>
                <input
                    {...props}
                    ref={ref}
                    type={visible ? 'text' : 'password'}
                    disabled={disabled}
                    readOnly={readOnly}
                    autoComplete={autoComplete}
                    className={cn(controlClasses, showToggle && 'pr-11')}
                />
                {showToggle ? (
                    <button
                        type="button"
                        className="absolute top-1/2 right-2 z-10 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-fg-muted transition-colors hover:text-fg disabled:opacity-50"
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
                ) : null}
            </div>
        );
    }
);
Password.displayName = 'Password';

export { Password };
