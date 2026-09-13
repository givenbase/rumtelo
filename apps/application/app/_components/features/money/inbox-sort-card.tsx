'use client';

import { useMemo, useState } from 'react';

import { Button } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { bgClassToCssVar } from '@/app/_lib/jar-chrome';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';

import { JAR_META } from '@/app/_lib/jar-meta';

interface InboxTransaction {
    readonly id: string;
    readonly description: string;
    readonly counterparty: string | null;
    readonly note?: string | null;
    readonly amount: number;
    readonly bookedOn: string;
}

export type InboxJarOption = {
    id: string;
    key: string;
    name: string;
    subtitle?: string | null;
};

function suggestJarKey(amount: number): string {
    if (amount > 0) return 'NECESSITIES';
    if (Math.abs(amount) < 2_000) return 'PLAY';
    return 'NECESSITIES';
}

function metaForKey(key: string) {
    return JAR_META.find(j => j.key === key) ?? JAR_META[0];
}

function resolveInitialJarId(
    jars: readonly InboxJarOption[],
    suggestedJarId: string | undefined,
    amount: number
): string {
    if (suggestedJarId && jars.some(j => j.id === suggestedJarId)) return suggestedJarId;
    const byKey = jars.find(j => j.key === suggestJarKey(amount));
    return byKey?.id ?? jars[0]?.id ?? '';
}

export function InboxSortCard({
    transaction,
    jars,
    suggestedJarId,
    onConfirm,
    onChange,
}: {
    transaction: InboxTransaction;
    jars: readonly InboxJarOption[];
    suggestedJarId?: string;
    onConfirm?: (transactionId: string, jarId: string, createRule?: boolean) => Promise<void>;
    onChange?: (transaction: InboxTransaction, jarId: string) => void;
}) {
    const { formatMoney } = useHouseholdCurrency();
    const [pickedJarId, setPickedJarId] = useState<string | null>(null);
    const [picking, setPicking] = useState(false);
    const [done, setDone] = useState(false);
    const [pending, setPending] = useState<'sort' | 'rule' | null>(null);

    const jarId = useMemo(() => {
        if (pickedJarId && jars.some(j => j.id === pickedJarId)) return pickedJarId;
        return resolveInitialJarId(jars, suggestedJarId, transaction.amount);
    }, [pickedJarId, jars, suggestedJarId, transaction.amount]);

    const selected = jars.find(j => j.id === jarId) ?? jars[0];
    const meta = metaForKey(selected?.key ?? suggestJarKey(transaction.amount));
    const confident =
        Boolean(suggestedJarId) ||
        suggestJarKey(transaction.amount) === 'NECESSITIES' ||
        Math.abs(transaction.amount) < 2_000;

    if (done) return null;

    async function confirm(createRule = false) {
        if (!jarId) return;
        if (!onConfirm) {
            setDone(true);
            return;
        }
        setPending(createRule ? 'rule' : 'sort');
        try {
            await onConfirm(transaction.id, jarId, createRule);
            setDone(true);
        } finally {
            setPending(null);
        }
    }

    return (
        <div className="grid animate-rise gap-4 rounded-2xl border border-line bg-surface p-5 shadow-md">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-base font-semibold text-fg">
                        {transaction.counterparty?.trim() || transaction.description}
                    </p>
                    <p className="mt-1 font-mono text-xs tracking-normal text-fg-muted">
                        {[
                            transaction.note?.trim() || null,
                            !transaction.note?.trim() &&
                            transaction.counterparty?.trim() &&
                            transaction.description !== transaction.counterparty.trim()
                                ? transaction.description
                                : null,
                            transaction.bookedOn,
                        ]
                            .filter(Boolean)
                            .join(' · ')}
                    </p>
                </div>
                <span
                    className={cn(
                        'shrink-0 font-mono text-lg',
                        transaction.amount < 0 ? 'text-fg' : 'text-success'
                    )}>
                    {formatMoney(transaction.amount, { signed: true })}
                </span>
            </div>

            <div className="grid gap-2.5">
                <button
                    type="button"
                    onClick={() => setPicking(previous => !previous)}
                    className="flex flex-wrap items-center gap-2.5 rounded-xl border border-line bg-raised px-3.5 py-3 text-left transition-colors hover:border-line-strong">
                    <span className="font-mono text-xs tracking-widest text-fg-muted uppercase">
                        Looks like
                    </span>
                    <span
                        className="size-2 shrink-0 rounded-sm"
                        style={{ background: bgClassToCssVar(meta.color) }}
                    />
                    <span className="text-sm text-fg">{selected?.name ?? meta.name}</span>
                    {selected?.subtitle ? (
                        <span className="text-sm text-fg-muted">· {selected.subtitle}</span>
                    ) : null}
                    <span
                        className={cn(
                            'ml-auto font-mono text-xs whitespace-nowrap',
                            confident ? 'text-fg-faint' : 'text-warning'
                        )}>
                        {confident ? 'fairly certain' : 'not sure — please check'}
                    </span>
                </button>

                {picking && jars.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                        {jars.map(jar => {
                            const jarMeta = metaForKey(jar.key);
                            const active = jar.id === jarId;
                            return (
                                <button
                                    key={jar.id}
                                    type="button"
                                    onClick={() => {
                                        setPickedJarId(jar.id);
                                        setPicking(false);
                                    }}
                                    className={cn(
                                        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-xs tracking-widest uppercase transition-colors',
                                        active
                                            ? 'border-accent/40 bg-accent-soft text-accent'
                                            : 'border-line text-fg-muted hover:border-line-strong hover:text-fg'
                                    )}>
                                    <span
                                        className="size-1.5 rounded-sm"
                                        style={{ background: bgClassToCssVar(jarMeta.color) }}
                                    />
                                    {jar.name}
                                </button>
                            );
                        })}
                    </div>
                ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
                <Button
                    size="sm"
                    onClick={() => void confirm(false)}
                    disabled={pending !== null || !jarId}>
                    {pending === 'sort' ? 'Working…' : 'Correct'}
                </Button>
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void confirm(true)}
                    disabled={pending !== null || !onConfirm || !jarId}>
                    {pending === 'rule' ? 'Working…' : 'Always this'}
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending !== null || !jarId}
                    onClick={() => onChange?.(transaction, jarId)}>
                    Other
                </Button>
            </div>
        </div>
    );
}

export function TabPills({
    tabs,
    active,
    onChange,
}: {
    tabs: readonly { id: string; label: string; count?: number }[];
    active: string;
    onChange: (id: string) => void;
}) {
    return (
        <div className="flex flex-wrap gap-1.5">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    type="button"
                    onClick={() => onChange(tab.id)}
                    className={cn(
                        'flex items-center gap-2 rounded-full border px-4 py-2 font-mono text-xs font-medium tracking-wide uppercase transition-all duration-200',
                        active === tab.id
                            ? 'border-accent/40 bg-accent-soft text-accent'
                            : 'border-line text-fg-muted hover:border-line-strong hover:text-fg'
                    )}>
                    {tab.label}
                    {(tab.count ?? 0) > 0 && (
                        <span className="rounded-full bg-warning/15 px-2 py-0.5 font-mono text-xs text-warning">
                            {tab.count}
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
}
