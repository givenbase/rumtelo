'use client';

import { useLocale, useTranslations } from '@rumtelo/i18n';
import { cn } from '@rumtelo/utils';

import { CAPABILITIES } from '@/app/_lib/plan';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';

type PreviewRow = {
    id: string;
    /** Product noun from the capability catalog; never sample words. */
    label: string | null;
    value: string;
    fill: 'w-1/5' | 'w-2/5' | 'w-3/5' | 'w-4/5' | 'w-full';
};

/**
 * Static "Example" illustration for a lock: shapes and sample numbers only, no data
 * fetch and no sample words (so nothing here needs translating). The caption sits
 * outside the hidden part, so a screen reader hears "Example" and moves on.
 */
export function LockPreview({
    capabilityKey,
    className,
}: {
    capabilityKey: string | null | undefined;
    className?: string;
}) {
    const t = useTranslations();
    const locale = useLocale();
    const { formatMoney } = useHouseholdCurrency();

    const monthYear = (year: number, month: number) =>
        new Intl.DateTimeFormat(locale, {
            month: 'short',
            year: 'numeric',
            timeZone: 'UTC',
        }).format(new Date(Date.UTC(year, month, 1)));
    const name = (key: string) => t(`features.capabilities.${key}.name`);

    let rows: PreviewRow[];
    switch (capabilityKey) {
        case CAPABILITIES.moneyDebt:
            rows = [
                {
                    id: 'r1',
                    label: name(CAPABILITIES.moneyDebt),
                    value: monthYear(2028, 2),
                    fill: 'w-3/5',
                },
                {
                    id: 'r2',
                    label: `+${formatMoney(5000)}`,
                    value: monthYear(2027, 7),
                    fill: 'w-4/5',
                },
            ];
            break;
        case CAPABILITIES.growthCourse:
            rows = [
                { id: 'r3', label: '1', value: '', fill: 'w-4/5' },
                { id: 'r4', label: '2', value: '', fill: 'w-3/5' },
                { id: 'r5', label: '3', value: '', fill: 'w-2/5' },
            ];
            break;
        case CAPABILITIES.moneyImport:
            rows = [
                { id: 'r6', label: null, value: formatMoney(-1250), fill: 'w-2/5' },
                { id: 'r7', label: null, value: formatMoney(-4290), fill: 'w-3/5' },
                { id: 'r8', label: null, value: formatMoney(240000), fill: 'w-full' },
            ];
            break;
        case CAPABILITIES.growthLearn:
            rows = [
                { id: 'r9', label: name(CAPABILITIES.growthLearn), value: '1 / 4', fill: 'w-1/5' },
            ];
            break;
        case CAPABILITIES.growthNetWorth:
            rows = [
                { id: 'r10', label: null, value: formatMoney(3240000), fill: 'w-4/5' },
                { id: 'r11', label: null, value: formatMoney(-1180000), fill: 'w-2/5' },
            ];
            break;
        default:
            rows = [
                { id: 'r12', label: null, value: '', fill: 'w-4/5' },
                { id: 'r13', label: null, value: '', fill: 'w-3/5' },
                { id: 'r14', label: null, value: '', fill: 'w-2/5' },
            ];
    }

    return (
        <div className={cn('rounded-2xl border border-line bg-raised p-4', className)}>
            <p className="font-mono text-xs font-semibold tracking-widest text-fg-muted uppercase">
                {t('pages.shell.gates.lock.example')}
            </p>
            <div aria-hidden className="mt-3 grid gap-3">
                {rows.map(row => (
                    <div key={row.id} className="grid min-w-0 gap-1.5">
                        {row.label || row.value ? (
                            <div className="flex min-w-0 items-baseline justify-between gap-3 text-sm">
                                <span className="min-w-0 truncate text-fg-secondary">
                                    {row.label}
                                </span>
                                <span className="shrink-0 font-mono text-fg tabular-nums">
                                    {row.value}
                                </span>
                            </div>
                        ) : null}
                        <div className="h-2 overflow-hidden rounded-full bg-line">
                            <div className={cn('h-full rounded-full bg-accent', row.fill)} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
