'use client';

import { useState } from 'react';

import { useTranslations } from '@rumtelo/i18n';
import { Input } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

type Props = {
    id: string;
    question: string;
    /** Chip values in hours. */
    options: readonly number[];
    /** Current value in minutes. */
    value: number;
    onChange: (minutes: number) => void;
    /** Small context next to the question, e.g. "on a workday: 6h". */
    hint?: string;
};

/**
 * One question, one row of tap targets. A number field appears only when the answer
 * is not on the row — most days it never does.
 */
export function HourChips({ id, question, options, value, onChange, hint }: Props) {
    const tc = useTranslations('features.energy.week.shape.chips');
    const hoursSuffix = tc('hours_suffix');

    const hoursLabel = (hours: number): string => {
        if (hours === 0) return tc('none');
        if (Number.isInteger(hours)) return `${hours}${hoursSuffix}`;
        const whole = Math.floor(hours);
        const fraction = hours - whole;
        const glyph =
            fraction === 0.25 ? '¼' : fraction === 0.5 ? '½' : fraction === 0.75 ? '¾' : '';
        return glyph && whole === 0
            ? `${glyph}${hoursSuffix}`
            : glyph
              ? `${whole}${glyph}${hoursSuffix}`
              : `${hours}${hoursSuffix}`;
    };

    const matches = options.some(option => Math.round(option * 60) === value);
    const [custom, setCustom] = useState(!matches && value > 0);
    const showCustom = custom || (!matches && value > 0);

    return (
        <fieldset className="grid gap-2">
            <legend className="flex flex-wrap items-baseline gap-x-2 text-sm font-medium text-fg">
                {question}
                {hint ? (
                    <span className="font-mono text-xs font-normal text-fg-faint">{hint}</span>
                ) : null}
            </legend>
            <div className="flex flex-wrap items-center gap-1.5">
                {options.map(option => {
                    const minutes = Math.round(option * 60);
                    const selected = minutes === value && !showCustom;
                    return (
                        <button
                            key={option}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => {
                                setCustom(false);
                                onChange(minutes);
                            }}
                            className={cn(
                                'h-8 rounded-full border px-3 font-mono text-xs tabular-nums transition-colors',
                                selected
                                    ? 'border-accent bg-accent text-on-accent'
                                    : 'border-line bg-raised text-fg-secondary hover:border-line-strong hover:text-fg'
                            )}>
                            {hoursLabel(option)}
                        </button>
                    );
                })}
                {showCustom ? (
                    <span className="flex items-center gap-1">
                        <Input
                            id={id}
                            type="number"
                            inputMode="decimal"
                            min={0}
                            max={24}
                            step={0.25}
                            aria-label={tc('aria_hours', { question })}
                            value={value ? String(Math.round((value / 60) * 100) / 100) : ''}
                            onChange={event => {
                                const hours = Number(event.target.value.replace(',', '.'));
                                onChange(
                                    Number.isFinite(hours) && hours > 0 ? Math.round(hours * 60) : 0
                                );
                            }}
                            className="h-8 w-20 text-xs"
                        />
                        <span className="font-mono text-xs text-fg-faint">{hoursSuffix}</span>
                    </span>
                ) : (
                    <button
                        type="button"
                        onClick={() => setCustom(true)}
                        className="h-8 rounded-full border border-dashed border-line px-3 font-mono text-xs text-fg-muted hover:text-fg">
                        {tc('other')}
                    </button>
                )}
            </div>
        </fieldset>
    );
}
