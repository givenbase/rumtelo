'use client';

import { CalendarIcon } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

import { cn } from '@rumtelo/utils';

import { Button } from '../Button';
import controlClasses from '../Input/styles';
import { Calendar, formatDisplayDate } from '../Calendar';

export type DatePickerProps = {
    value?: string | null;
    onChange?: (iso: string) => void;
    min?: string | null;
    max?: string | null;
    placeholder?: string;
    disabled?: boolean;
    id?: string;
    className?: string;
    /** BCP 47 locale — forwarded to the calendar grid. */
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
    /** Close button when the popover calendar is open. Pass from `useTranslations`. */
    closeLabel?: string;
    /** When true, calendar stays open under the field (good inside dialogs). */
    inline?: boolean;
};

/** Branded date field — replaces native `type="date"` so pickers match the design system. */
export function DatePicker({
    value,
    onChange,
    min,
    max,
    placeholder = 'Pick a date',
    disabled,
    id,
    className,
    locale,
    labels,
    closeLabel = 'Close',
    inline = false,
}: DatePickerProps) {
    const autoId = useId();
    const fieldId = id ?? autoId;
    const rootRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(inline);

    useEffect(() => {
        if (inline || !open) return;

        function onPointerDown(event: MouseEvent) {
            if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
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

    return (
        <div ref={rootRef} className={cn('relative grid gap-2', className)}>
            <button
                type="button"
                id={fieldId}
                disabled={disabled}
                aria-haspopup="dialog"
                aria-expanded={open}
                onClick={() => {
                    if (!inline) setOpen(current => !current);
                }}
                className={cn(
                    controlClasses,
                    'inline-flex items-center justify-between gap-2 text-left',
                    !value && 'text-fg-faint'
                )}>
                <span className="truncate">
                    {value ? formatDisplayDate(value, locale) : placeholder}
                </span>
                <CalendarIcon className="size-4 shrink-0 text-fg-muted" aria-hidden />
            </button>

            {open ? (
                <div
                    className={cn(
                        inline ? 'relative' : 'absolute top-[calc(100%+0.5rem)] left-0 z-50'
                    )}>
                    <Calendar
                        value={value}
                        min={min}
                        max={max}
                        locale={locale}
                        labels={labels}
                        onSelect={iso => {
                            onChange?.(iso);
                            if (!inline) setOpen(false);
                        }}
                    />
                    {!inline ? (
                        <div className="mt-2 flex justify-end">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setOpen(false)}>
                                {closeLabel}
                            </Button>
                        </div>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
