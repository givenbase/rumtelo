'use client';

import { Cadence } from '@rumtelo/contracts';
import { Icon, type IconName } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

export type RecurringCadence =
    | typeof Cadence.WEEKLY
    | typeof Cadence.MONTHLY
    | typeof Cadence.QUARTERLY
    | typeof Cadence.YEARLY;

const CADENCE_ICONS: Record<RecurringCadence, IconName> = {
    [Cadence.WEEKLY]: 'calendar-days',
    [Cadence.MONTHLY]: 'calendar',
    [Cadence.QUARTERLY]: 'calendar-range',
    [Cadence.YEARLY]: 'calendar-fold',
};

/** Narrow API / catalog `Cadence` (may include ONCE) to the recurring set used in forms. */
export function toRecurringCadence(cadence: Cadence | null | undefined): RecurringCadence {
    if (
        cadence === Cadence.WEEKLY ||
        cadence === Cadence.MONTHLY ||
        cadence === Cadence.QUARTERLY ||
        cadence === Cadence.YEARLY
    ) {
        return cadence;
    }
    return Cadence.MONTHLY;
}

export type CadencePickerOption = {
    id: RecurringCadence;
    label: string;
    /** One short line under the label (e.g. “Every week”). */
    hint: string;
};

/**
 * Shared cadence cards for fixed-cost / debt forms — icon + label + hint.
 * Monthly is usually the default; weekly covers meal kits and similar bills.
 */
export function CadencePicker({
    heading,
    options,
    value,
    onChange,
    disabled,
}: {
    heading: string;
    options: readonly CadencePickerOption[];
    value: RecurringCadence;
    onChange: (next: RecurringCadence) => void;
    disabled?: boolean;
}) {
    return (
        <div className="grid gap-2">
            <p className="font-mono text-[10px] font-semibold tracking-wider text-fg-muted uppercase">
                {heading}
            </p>
            <div className="grid grid-cols-2 gap-2">
                {options.map(option => {
                    const selected = value === option.id;
                    return (
                        <button
                            key={option.id}
                            type="button"
                            disabled={disabled}
                            aria-pressed={selected}
                            className={cn(
                                'flex min-h-[4.5rem] flex-col items-start gap-2 rounded-2xl border px-3 py-2.5 text-left transition-colors',
                                selected
                                    ? 'border-accent bg-accent/15 text-accent'
                                    : 'border-line bg-raised text-fg hover:border-accent/60',
                                disabled && 'pointer-events-none opacity-50'
                            )}
                            onClick={() => onChange(option.id)}>
                            <Icon
                                name={CADENCE_ICONS[option.id]}
                                size="md"
                                className={cn('text-fg-muted', selected && 'text-accent')}
                            />
                            <span className="grid gap-0.5">
                                <span className="text-sm font-medium">{option.label}</span>
                                <span
                                    className={cn(
                                        'text-xs leading-snug text-fg-muted',
                                        selected && 'text-accent/80'
                                    )}>
                                    {option.hint}
                                </span>
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
