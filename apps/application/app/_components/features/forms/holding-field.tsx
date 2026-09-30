'use client';

import { useTranslations } from '@rumtelo/i18n';
import { FORM_SELECT_NONE, FormSelect, FormSelectItem, toFormSelectValue } from '@rumtelo/ui';

import { useHoldings } from '@/app/_lib/use-holdings';

type HoldingFieldProps = {
    value: string | null;
    onChange: (assetId: string | null) => void;
    /** Opened from a holding (`?assetId=`): show it, do not let it change. */
    locked?: boolean;
    disabled?: boolean;
};

/**
 * Optional “Part of a holding” picker for bills, income and one-offs.
 * Hidden when the plan has no net worth (unless the row already carries a link).
 * Attribution only — the jar field stays the source of truth for the six jars.
 */
export function HoldingField({
    value,
    onChange,
    locked = false,
    disabled = false,
}: HoldingFieldProps) {
    const t = useTranslations('features.money.holding_link');
    const { canLink, holdings, byId, ready } = useHoldings();

    if (!canLink && !value) return null;
    if (canLink && ready && holdings.length === 0 && !value) return null;

    const current = value ? byId.get(value) : undefined;

    if (locked && value) {
        return (
            <div className="grid gap-1.5">
                <p className="font-mono text-[10px] font-semibold tracking-wider text-fg-muted uppercase">
                    {t('locked_eyebrow')}
                </p>
                <div className="flex items-center gap-3 rounded-xl border border-accent bg-accent-soft px-3 py-3">
                    <span className="text-lg" aria-hidden>
                        {current?.icon ?? '✦'}
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-fg">
                            {current?.name ?? t('kind_fallback')}
                        </p>
                        <p className="font-mono text-[10px] tracking-wide text-fg-muted uppercase">
                            {t('locked_hint')}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="grid gap-1.5">
            <p className="font-mono text-[10px] font-semibold tracking-wider text-fg-muted uppercase">
                {t('label')}
            </p>
            <FormSelect
                value={toFormSelectValue(value)}
                disabled={disabled || !canLink}
                withFormControl={false}
                onValueChange={next => onChange(next === FORM_SELECT_NONE ? null : next)}>
                <FormSelectItem value={FORM_SELECT_NONE}>{t('none')}</FormSelectItem>
                {holdings.map(holding => (
                    <FormSelectItem key={holding.id} value={holding.id}>
                        {holding.icon ? `${holding.icon} ` : ''}
                        {holding.name}
                    </FormSelectItem>
                ))}
            </FormSelect>
            <p className="text-xs leading-relaxed text-fg-faint">{t('hint')}</p>
        </div>
    );
}
