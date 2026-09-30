'use client';

import { forwardRef, useEffect, useId, useRef, useState } from 'react';

import { cn } from '@rumtelo/utils';

import { Icon } from '../../display/Icon';
import { endActionClasses, fieldControlClasses, fieldWrapperClasses } from '../Input/styles';
import { Calendar, dateInputPlaceholder, formatInputDate, parseInputDate } from '../Calendar';

export type DatePickerProps = {
    value?: string | null;
    onChange?: (iso: string) => void;
    onBlur?: () => void;
    name?: string;
    min?: string | null;
    max?: string | null;
    placeholder?: string;
    disabled?: boolean;
    id?: string;
    className?: string;
    /** BCP 47 locale — typed format + calendar captions. */
    locale?: string;
    /** Optional a11y labels — forwarded to the calendar grid. */
    labels?: {
        previousMonth?: string;
        nextMonth?: string;
        month?: string;
        year?: string;
        today?: string;
        pickADay?: string;
    };
    /** aria-label for the calendar icon button. */
    openCalendarLabel?: string;
    /** When true, calendar stays open under the field (good inside dialogs). */
    inline?: boolean;
};

function isInsideSelectPortal(target: EventTarget | null): boolean {
    if (!(target instanceof Element)) return false;
    return Boolean(
        target.closest(
            '[data-slot="select-content"], [data-slot="select-trigger"], [data-radix-select-content], [data-radix-select-viewport]'
        )
    );
}

/**
 * Date field — shadcn-style composition: typeable input + calendar popover.
 * Value is always ISO `YYYY-MM-DD`. Typed display follows the locale (`01-01-1990`).
 */
export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(function DatePicker(
    {
        value,
        onChange,
        onBlur,
        name,
        min,
        max,
        placeholder,
        disabled,
        id,
        className,
        locale,
        labels,
        openCalendarLabel = 'Open date picker',
        inline = false,
        ...inputProps
    },
    ref
) {
    const autoId = useId();
    const fieldId = id ?? autoId;
    const rootRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(inline);
    /** Null = show formatted `value`; string = user is typing. */
    const [draft, setDraft] = useState<string | null>(null);
    const display = draft ?? (value ? formatInputDate(value, locale) : '');

    useEffect(() => {
        if (inline || !open) return;

        function onPointerDown(event: MouseEvent) {
            if (rootRef.current?.contains(event.target as Node)) return;
            // Month/year Select portals outside the root — do not close the calendar.
            if (isInsideSelectPortal(event.target)) return;
            setOpen(false);
        }
        function onKey(event: KeyboardEvent) {
            if (event.key === 'Escape') setOpen(false);
        }
        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [inline, open]);

    function commitText(raw: string) {
        if (!raw.trim()) {
            setDraft(null);
            if (value) onChange?.('');
            return;
        }
        const parsed = parseInputDate(raw, locale);
        if (!parsed || (min && parsed < min) || (max && parsed > max)) {
            setDraft(null);
            return;
        }
        setDraft(null);
        if (parsed !== value) onChange?.(parsed);
    }

    const hint = placeholder ?? dateInputPlaceholder(locale);

    return (
        <div ref={rootRef} className={cn('relative grid gap-2', className)}>
            <div
                className={cn(
                    fieldWrapperClasses,
                    open && !inline && 'border-accent ring-2 ring-accent/25',
                    disabled && 'pointer-events-none opacity-60'
                )}
                data-disabled={disabled || undefined}
                data-state={open ? 'open' : 'closed'}>
                <input
                    {...inputProps}
                    ref={ref}
                    type="text"
                    inputMode="numeric"
                    autoComplete="bday"
                    id={fieldId}
                    name={name}
                    disabled={disabled}
                    value={display}
                    placeholder={hint}
                    onChange={event => {
                        const next = event.target.value;
                        setDraft(next);
                        const parsed = parseInputDate(next, locale);
                        if (!parsed) return;
                        if (min && parsed < min) return;
                        if (max && parsed > max) return;
                        if (parsed !== value) onChange?.(parsed);
                    }}
                    onBlur={() => {
                        commitText(display);
                        onBlur?.();
                    }}
                    onKeyDown={event => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            commitText(display);
                            if (!inline) setOpen(false);
                        }
                    }}
                    className={cn(
                        fieldControlClasses,
                        'font-mono text-[13px] tracking-wide tabular-nums'
                    )}
                />
                <div className={cn(endActionClasses, open && 'border-accent bg-accent-soft/50')}>
                    <button
                        type="button"
                        tabIndex={-1}
                        disabled={disabled}
                        aria-label={openCalendarLabel}
                        aria-haspopup="dialog"
                        aria-expanded={open}
                        aria-controls={`${fieldId}-calendar`}
                        onClick={() => {
                            if (!inline) setOpen(current => !current);
                        }}
                        className={cn(
                            'grid size-9 place-items-center rounded-md transition-colors disabled:pointer-events-none',
                            open
                                ? 'bg-accent text-on-accent shadow-sm'
                                : 'text-fg-muted hover:bg-raised hover:text-accent'
                        )}>
                        <Icon name="calendar" size="md" />
                    </button>
                </div>
            </div>

            {open ? (
                <div
                    id={`${fieldId}-calendar`}
                    role="dialog"
                    aria-label={openCalendarLabel}
                    className={cn(
                        'animate-rise',
                        inline ? 'relative' : 'absolute top-[calc(100%+0.55rem)] left-0 z-50'
                    )}>
                    <Calendar
                        value={value}
                        min={min}
                        max={max}
                        locale={locale}
                        labels={labels}
                        onSelect={iso => {
                            setDraft(null);
                            onChange?.(iso);
                            if (!inline) setOpen(false);
                        }}
                    />
                </div>
            ) : null}
        </div>
    );
});
DatePicker.displayName = 'DatePicker';
