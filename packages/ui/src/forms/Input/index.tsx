'use client';

import * as React from 'react';

import { CalendarIcon } from 'lucide-react';

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

/** date / month / time — keep typing, surface a visible picker affordance. */
const TEMPORAL_INPUT_TYPES = new Set(['date', 'datetime-local', 'month', 'time', 'week']);

const temporalFieldClass =
    '[&::-webkit-calendar-picker-indicator]:h-0 [&::-webkit-calendar-picker-indicator]:w-0 ' +
    '[&::-webkit-calendar-picker-indicator]:p-0 [&::-webkit-calendar-picker-indicator]:opacity-0';

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, endAction, startAffix, type, ...props }, ref) => {
        const inputRef = React.useRef<HTMLInputElement | null>(null);
        const isTemporal = Boolean(type && TEMPORAL_INPUT_TYPES.has(type));

        const setRefs = React.useCallback(
            (node: HTMLInputElement | null) => {
                inputRef.current = node;
                if (typeof ref === 'function') ref(node);
                else if (ref) ref.current = node;
            },
            [ref]
        );

        const openNativePicker = () => {
            const el = inputRef.current;
            if (!el || el.disabled || props.readOnly) return;
            try {
                if (typeof el.showPicker === 'function') {
                    el.showPicker();
                    return;
                }
            } catch {
                // showPicker can throw outside a user gesture / unsupported.
            }
            el.focus();
            el.click();
        };

        const resolvedEndAction =
            endAction ??
            (isTemporal ? (
                <button
                    type="button"
                    aria-label="Open date picker"
                    className="inline-flex size-8 items-center justify-center rounded-md text-fg-muted transition-colors hover:text-fg disabled:opacity-50"
                    disabled={props.disabled}
                    onClick={openNativePicker}>
                    <CalendarIcon className="size-4" aria-hidden />
                </button>
            ) : null);

        const hasStartAffix = Boolean(startAffix);
        const hasEndAction = Boolean(resolvedEndAction);
        const composed = hasStartAffix || hasEndAction;

        if (!composed) {
            return (
                <input
                    ref={setRefs}
                    type={type}
                    className={cn(controlClasses, className)}
                    {...props}
                />
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

                <input
                    ref={setRefs}
                    type={type}
                    className={cn(fieldControlClasses, isTemporal && temporalFieldClass)}
                    {...props}
                />

                {hasEndAction ? <div className={endActionClasses}>{resolvedEndAction}</div> : null}
            </div>
        );
    }
);
Input.displayName = 'Input';

export { Input, controlClasses, fieldWrapperClasses, fieldControlClasses };
