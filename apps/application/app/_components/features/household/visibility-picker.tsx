'use client';

import { type VisibilityChoice } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';
import { Icon } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { VISIBILITY_ICON } from './visibility-icon';

/**
 * "Who sees this?" — options come from the server (`visibilityOptionsFor` in contracts),
 * so a member only gets "only me / share with the owner" unless the owner opens it up.
 */
export function VisibilityPicker({
    options,
    value,
    onChange,
    ownerName,
    disabled,
}: {
    options: readonly VisibilityChoice[];
    value: VisibilityChoice;
    onChange: (next: VisibilityChoice) => void;
    ownerName: string | null;
    disabled?: boolean;
}) {
    const t = useTranslations('features.growth.course.visibility');
    const owner = ownerName ?? t('owner_fallback');

    return (
        <fieldset className="grid gap-2" disabled={disabled}>
            <legend className="mb-2 text-sm font-medium text-fg">{t('label')}</legend>
            <div
                className="grid gap-1 rounded-xl bg-raised p-1"
                style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
                {options.map(option => {
                    const selected = option === value;
                    return (
                        <label
                            key={option}
                            className={cn(
                                'flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2 text-center text-sm transition-colors',
                                'has-focus-visible:ring-2 has-focus-visible:ring-accent',
                                selected
                                    ? 'bg-accent font-semibold text-on-accent'
                                    : 'text-fg-secondary hover:bg-surface'
                            )}>
                            <input
                                type="radio"
                                name="visibility"
                                value={option}
                                checked={selected}
                                onChange={() => onChange(option)}
                                className="sr-only"
                            />
                            <Icon name={VISIBILITY_ICON[option]} size="sm" aria-hidden />
                            {t(option, { owner })}
                        </label>
                    );
                })}
            </div>
            <p className="text-sm text-fg-muted">{t(`hint_${value}`, { owner })}</p>
        </fieldset>
    );
}
