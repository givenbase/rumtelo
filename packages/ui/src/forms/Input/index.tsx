'use client';

import * as React from 'react';

import { cn } from '@rumtelo/utils';

import {
    controlClasses,
    endActionClasses,
    fieldControlClasses,
    fieldWrapperClasses,
    startAffixClasses,
} from './styles';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
    /** Non-editable leading chrome (currency, URL base, etc.). */
    startAffix?: React.ReactNode;
    /** Trailing control inside the field shell (clear, generate, show/hide). */
    endAction?: React.ReactNode;
};

/**
 * Text field. For calendar dates use {@link DatePicker} — do not pass `type="date"`.
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, endAction, startAffix, type, ...props }, ref) => {
        const hasStartAffix = Boolean(startAffix);
        const hasEndAction = Boolean(endAction);
        const composed = hasStartAffix || hasEndAction;

        if (!composed) {
            return (
                <input ref={ref} type={type} className={cn(controlClasses, className)} {...props} />
            );
        }

        return (
            <div className={cn(fieldWrapperClasses, className)}>
                {hasStartAffix ? (
                    <span
                        className={startAffixClasses}
                        title={typeof startAffix === 'string' ? startAffix : undefined}>
                        <span className="min-w-0 truncate">{startAffix}</span>
                    </span>
                ) : null}

                <input ref={ref} type={type} className={fieldControlClasses} {...props} />

                {hasEndAction ? <div className={endActionClasses}>{endAction}</div> : null}
            </div>
        );
    }
);
Input.displayName = 'Input';

export { Input, controlClasses, fieldWrapperClasses, fieldControlClasses };
