'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import type { Debt, FixedCost, Jar, Transaction } from '@rumtelo/contracts';
import { JarKey } from '@rumtelo/contracts';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import { Button, VendorMark } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { bgClassToCssVar } from '@/app/_lib/jar-chrome';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';

import { jarChrome } from '@/app/_lib/jar-meta';
import { useJarCatalog } from '@/app/_lib/use-jar-catalog';
import { catalogMarkChrome } from '@/app/_lib/party-mark-chrome';
import { partyMark } from '@/app/_lib/vendor-brands';
import { useCategoryTemplates } from '@/components/features/forms/catalog-helpers';
import { formatBookedDate } from '@/components/features/money/jar-badge';
import { isLiveData } from '@/app/_lib/preview';
import { useAuth } from '@/components/features/shell/auth-provider';

type InboxJarOption = Pick<Jar, 'id' | 'key' | 'name' | 'subtitle'>;
type InboxDebtOption = Pick<Debt, 'id' | 'name'>;
type InboxFixedCostOption = Pick<FixedCost, 'id' | 'name' | 'counterparty'>;

function suggestJarKey(amount: number): JarKey {
    if (amount > 0) return JarKey.NECESSITIES;
    if (Math.abs(amount) < 2_000) return JarKey.PLAY;
    return JarKey.NECESSITIES;
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
    debts = [],
    suggestedFixedCost,
    suggestedJarId,
    logoDomain,
    onConfirm,
    detailHref,
    onChange,
}: {
    transaction: Transaction;
    jars: readonly InboxJarOption[];
    /** Open debts — optional “apply as payment” for outflows. */
    debts?: readonly InboxDebtOption[];
    /** Suggested recurring bill to link (heuristic). */
    suggestedFixedCost?: InboxFixedCostOption | null;
    suggestedJarId?: string;
    /** From merchant catalog match when known. */
    logoDomain?: string | null;
    onConfirm?: (
        transactionId: string,
        jarId: string,
        createRule?: boolean,
        debtId?: string | null,
        fixedCostId?: string | null
    ) => Promise<void>;
    /** Prefer for “Other” — opens transaction detail. */
    detailHref?: string;
    onChange?: (transaction: Transaction, jarId: string) => void;
}) {
    const { formatMoney } = useHouseholdCurrency();
    const appLocale = useLocale();
    const tTx = useTranslations('features.money.transactions');
    const tSort = useTranslations('features.money.transactions.inbox_sort');
    const tExpense = useTranslations('features.money.expense_form');
    const { householdId } = useAuth();
    const { byKey: catalogByKey } = useJarCatalog();
    const categoryTemplatesQuery = useCategoryTemplates(isLiveData(householdId));
    const [pickedJarId, setPickedJarId] = useState<string | null>(null);
    const [debtId, setDebtId] = useState<string | null>(null);
    const [linkFixedCost, setLinkFixedCost] = useState(Boolean(suggestedFixedCost));
    const [picking, setPicking] = useState(false);
    const [done, setDone] = useState(false);
    const [pending, setPending] = useState<'sort' | 'rule' | null>(null);

    const jarId = useMemo(() => {
        if (pickedJarId && jars.some(j => j.id === pickedJarId)) return pickedJarId;
        return resolveInitialJarId(jars, suggestedJarId, transaction.amount);
    }, [pickedJarId, jars, suggestedJarId, transaction.amount]);

    const selected = jars.find(j => j.id === jarId) ?? jars[0];
    const suggestedKey = selected?.key ?? suggestJarKey(transaction.amount);
    const catalog = catalogByKey.get(suggestedKey);
    const title = transaction.counterparty?.trim() || transaction.description;
    const feedText = `${transaction.counterparty ?? ''} ${transaction.description}`;
    const mark = partyMark(
        { name: title, logoDomain: logoDomain ?? null },
        catalogMarkChrome({
            billName: title,
            searchText: feedText,
            jarKey: suggestedKey,
            jarByKey: catalogByKey,
            categoryTemplates: categoryTemplatesQuery.data ?? [],
        })
    );
    const confident =
        Boolean(suggestedJarId) ||
        suggestJarKey(transaction.amount) === 'NECESSITIES' ||
        Math.abs(transaction.amount) < 2_000;
    const canApplyDebt = transaction.amount < 0 && debts.length > 0 && !linkFixedCost;
    const canLinkFixed = Boolean(suggestedFixedCost) && !debtId;

    if (done) return null;

    async function confirm(createRule = false) {
        if (!jarId) return;
        if (!onConfirm) {
            setDone(true);
            return;
        }
        setPending(createRule ? 'rule' : 'sort');
        try {
            await onConfirm(
                transaction.id,
                jarId,
                createRule,
                canApplyDebt ? debtId : null,
                canLinkFixed && linkFixedCost ? suggestedFixedCost!.id : null
            );
            setDone(true);
        } finally {
            setPending(null);
        }
    }

    return (
        <div className="grid animate-rise gap-4 rounded-2xl border border-line bg-surface p-5 shadow-md">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                    <VendorMark
                        name={mark.name}
                        src={mark.src}
                        fallbackIcon={mark.fallbackIcon}
                        tone={mark.tone}
                        size={28}
                        className="mt-0.5"
                    />
                    <div className="min-w-0">
                        <p className="text-base font-semibold text-fg">{title}</p>
                        <p className="mt-1 font-mono text-xs tracking-normal text-fg-muted">
                            {[
                                transaction.note?.trim() || null,
                                !transaction.note?.trim() &&
                                transaction.counterparty?.trim() &&
                                transaction.description !== transaction.counterparty.trim()
                                    ? transaction.description
                                    : null,
                                formatBookedDate(transaction.bookedOn, appLocale),
                            ]
                                .filter(Boolean)
                                .join(' · ')}
                        </p>
                    </div>
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
                        {tTx('detail.looks_like')}
                    </span>
                    <span
                        className="size-2 shrink-0 rounded-sm"
                        style={{ background: bgClassToCssVar(jarChrome(suggestedKey).color) }}
                    />
                    <span className="text-sm text-fg">
                        {selected?.name ?? catalog?.name ?? tTx('jar_fallback')}
                    </span>
                    {selected?.subtitle ? (
                        <span className="text-sm text-fg-muted">· {selected.subtitle}</span>
                    ) : null}
                    <span
                        className={cn(
                            'ml-auto font-mono text-xs whitespace-nowrap',
                            confident ? 'text-fg-faint' : 'text-warning'
                        )}>
                        {confident ? tSort('fairly_certain') : tSort('not_sure_check')}
                    </span>
                </button>

                {picking && jars.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                        {jars.map(jar => {
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
                                        style={{
                                            background: bgClassToCssVar(jarChrome(jar.key).color),
                                        }}
                                    />
                                    {jar.name}
                                </button>
                            );
                        })}
                    </div>
                ) : null}
            </div>

            {suggestedFixedCost ? (
                <div className="flex items-start gap-3 rounded-xl border border-line bg-raised px-3.5 py-3 text-left">
                    <input
                        id="inbox-link-fixed-cost"
                        type="checkbox"
                        className="mt-1"
                        checked={linkFixedCost && canLinkFixed}
                        disabled={Boolean(debtId)}
                        aria-label={tSort('link_fixed_aria', {
                            name:
                                suggestedFixedCost.counterparty?.trim() || suggestedFixedCost.name,
                        })}
                        onChange={event => {
                            setLinkFixedCost(event.target.checked);
                            if (event.target.checked) setDebtId(null);
                        }}
                    />
                    <label htmlFor="inbox-link-fixed-cost" className="min-w-0 cursor-pointer">
                        <span className="block font-mono text-[10px] tracking-widest text-fg-muted uppercase">
                            {tSort('link_fixed_cost')}
                        </span>
                        <span className="mt-0.5 block text-sm text-fg">
                            {suggestedFixedCost.counterparty?.trim() || suggestedFixedCost.name}
                        </span>
                    </label>
                </div>
            ) : null}

            {canApplyDebt ? (
                <div className="grid gap-2">
                    <label
                        htmlFor="inbox-apply-debt"
                        className="font-mono text-[10px] tracking-widest text-fg-muted uppercase">
                        {tExpense('apply_to_debt')}
                    </label>
                    <select
                        id="inbox-apply-debt"
                        value={debtId ?? ''}
                        onChange={event => {
                            const next = event.target.value || null;
                            setDebtId(next);
                            if (next) setLinkFixedCost(false);
                        }}
                        className="h-10 w-full rounded-lg border border-line bg-raised px-3 text-sm text-fg outline-none focus:border-accent">
                        <option value="">{tExpense('dont_link')}</option>
                        {debts.map(debt => (
                            <option key={debt.id} value={debt.id}>
                                {debt.name}
                            </option>
                        ))}
                    </select>
                </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
                <Button
                    size="sm"
                    onClick={() => void confirm(false)}
                    disabled={pending !== null || !jarId}>
                    {pending === 'sort' ? tTx('working') : tSort('correct')}
                </Button>
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void confirm(true)}
                    disabled={pending !== null || !onConfirm || !jarId}>
                    {pending === 'rule' ? tTx('working') : tSort('always_this')}
                </Button>
                {detailHref ? (
                    <Button as={Link} href={detailHref} variant="ghost" size="sm">
                        {tSort('other')}
                    </Button>
                ) : (
                    <Button
                        variant="ghost"
                        size="sm"
                        disabled={pending !== null || !jarId}
                        onClick={() => onChange?.(transaction, jarId)}>
                        {tSort('other')}
                    </Button>
                )}
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
