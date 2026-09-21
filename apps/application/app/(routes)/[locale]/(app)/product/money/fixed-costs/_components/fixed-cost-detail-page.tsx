'use client';

import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

import { FlowDirection } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import {
    Button,
    Calendar,
    Card,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Typography,
    VendorMark,
    cn,
} from '@rumtelo/ui';
import { monthlyAmount, toPeriodKey } from '@rumtelo/utils';

import { debtDetailHref, txDetailHref, updateHref } from '@/app/_lib/create-routes';
import {
    fixedCostLifecycle,
    fixedCostStatus,
    isFixedCostCounting,
    lifecycleLabel,
    todayIsoDate,
} from '@/app/_lib/fixed-cost-match';
import { bgClassToCssVar, cadenceLabel } from '@/app/_lib/jar-chrome';
import { jarChrome } from '@/app/_lib/jar-meta';
import { jarKeyToSlug } from '@/app/_lib/jar-slug';
import { catalogMarkChrome } from '@/app/_lib/party-mark-chrome';
import { isLiveData } from '@/app/_lib/preview';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import { useJarCatalog } from '@/app/_lib/use-jar-catalog';
import { findPartyVendor, partyMark } from '@/app/_lib/vendor-brands';
import { useCategoryTemplates } from '@/components/features/forms/catalog-helpers';
import {
    JarBadge,
    MetaChip,
    formatBookedDate,
    formatDueDay,
} from '@/components/features/money/jar-badge';
import { MoneyPartyRow } from '@/components/features/money/money-party-row';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';
import {
    EditIcon,
    EndIcon,
    PauseIcon,
    ReactivateIcon,
    ResumeIcon,
} from '@/components/features/ui/action-icons';

function statusLabel(status: ReturnType<typeof fixedCostStatus>) {
    if (status === 'taken') return 'Taken this period';
    if (status === 'due') return 'Still due';
    if (status === 'skipped') return 'Skipped this period';
    return 'Planned';
}

function invalidateFixedCostQueries(queryClient: ReturnType<typeof useQueryClient>) {
    void queryClient.invalidateQueries({ queryKey: apiQuery.money.fixedCosts.key() });
    void queryClient.invalidateQueries({ queryKey: apiQuery.money.jars.balances.key() });
    void queryClient.invalidateQueries({ queryKey: apiQuery.money.transactions.key() });
}

type ConfirmKind = 'pause' | 'end' | null;

/**
 * Fixed-cost detail — see the plan and this period’s status; Edit opens the form.
 * Lifecycle is stored as isActive + endsOn (Active / Paused / Ended).
 */
export function FixedCostDetailPageClient({ fixedCostId }: { fixedCostId: string }) {
    const { householdId } = useAuth();
    const { period, showToast } = useAppShell();
    const queryClient = useQueryClient();
    const { formatMoney } = useHouseholdCurrency();
    const live = isLiveData(householdId);
    const periodKey = toPeriodKey(period.year, period.month);
    const { byKey: jarByKey } = useJarCatalog();
    const categoryTemplatesQuery = useCategoryTemplates(live);
    const [confirmKind, setConfirmKind] = useState<ConfirmKind>(null);
    const [endWhen, setEndWhen] = useState<'today' | 'earlier'>('today');
    const [endDate, setEndDate] = useState(() => todayIsoDate());

    const listQuery = useLiveQuery(
        apiQuery.money.fixedCosts.list.queryOptions({ input: { householdId: householdId! } }),
        [] as never,
        live
    );
    const jarsQuery = useLiveQuery(
        apiQuery.money.jars.list.queryOptions({ input: { householdId: householdId! } }),
        [] as never,
        live
    );
    const periodTxQuery = useLiveQuery(
        apiQuery.money.transactions.list.queryOptions({
            input: { householdId: householdId!, period: periodKey, limit: 200 },
        }),
        { items: [], nextCursor: null },
        live
    );
    const settlementsQuery = useLiveQuery(
        apiQuery.money.fixedCosts.listSettlements.queryOptions({
            input: {
                householdId: householdId!,
                fixedCostId,
                period: periodKey,
            },
        }),
        [] as never,
        live
    );
    const merchantsQuery = useLiveQuery(
        apiQuery.money.catalogs.merchantPresets.list.queryOptions({
            input: { householdId: householdId! },
        }),
        [] as never,
        live
    );
    const givingOrgsQuery = useLiveQuery(
        apiQuery.money.catalogs.givingOrganisations.list.queryOptions({
            input: { householdId: householdId! },
        }),
        [] as never,
        live
    );

    const item = (listQuery.data ?? []).find(row => row.id === fixedCostId);
    const jars = jarsQuery.data ?? [];
    const jar = item ? jars.find(row => row.id === item.jarId) : undefined;
    const merchants = merchantsQuery.data ?? [];
    const givingOrgs = givingOrgsQuery.data ?? [];
    const categoryTemplates = categoryTemplatesQuery.data ?? [];
    const periodTxs = periodTxQuery.data?.items ?? [];
    const settlement = (settlementsQuery.data ?? [])[0];

    const lifecycleMutation = useMutation({
        mutationFn: async (patch: { isActive: boolean; endsOn?: string | null }) => {
            if (!householdId || !item) throw new Error('No household');
            return api.money.fixedCosts.update({
                id: item.id,
                householdId,
                isActive: patch.isActive,
                ...(patch.endsOn !== undefined ? { endsOn: patch.endsOn } : {}),
            });
        },
        onSuccess: (_data, patch) => {
            invalidateFixedCostQueries(queryClient);
            setConfirmKind(null);
            if (patch.isActive) showToast('Bill is active again', 'success');
            else if (patch.endsOn) showToast('Bill ended', 'success');
            else showToast('Bill paused', 'success');
        },
        onError: () => showToast('Could not update status', 'error'),
    });

    const settleMutation = useMutation({
        mutationFn: async (action: 'paid' | 'skip' | 'unlink') => {
            if (!householdId || !item) throw new Error('No household');
            if (action === 'paid') {
                return api.money.fixedCosts.markPaid({
                    householdId,
                    fixedCostId: item.id,
                    period: periodKey,
                });
            }
            if (action === 'skip') {
                return api.money.fixedCosts.skip({
                    householdId,
                    fixedCostId: item.id,
                    period: periodKey,
                });
            }
            if (!settlement) throw new Error('No settlement');
            return api.money.fixedCosts.unlinkSettlement({
                householdId,
                id: settlement.id,
            });
        },
        onSuccess: (_data, action) => {
            invalidateFixedCostQueries(queryClient);
            if (action === 'paid') showToast('Marked paid for this period', 'success');
            else if (action === 'skip') showToast('Skipped this period', 'success');
            else showToast('Period reopened', 'success');
        },
        onError: () => showToast('Could not update settlement', 'error'),
    });

    function openPauseConfirm() {
        setConfirmKind('pause');
    }

    function openEndConfirm() {
        setEndWhen('today');
        setEndDate(todayIsoDate());
        setConfirmKind('end');
    }

    function confirmPause() {
        lifecycleMutation.mutate({ isActive: false });
    }

    function confirmEnd() {
        const today = todayIsoDate();
        const endsOn = endWhen === 'today' ? today : endDate;
        if (!endsOn || endsOn > today) {
            showToast('Pick a date today or earlier', 'error');
            return;
        }
        lifecycleMutation.mutate({ isActive: false, endsOn });
    }

    if (live && listQuery.isLoading && !item) {
        return (
            <Typography as="p" size="sm" color="muted">
                Loading…
            </Typography>
        );
    }
    if (!item) {
        return (
            <div className="grid gap-4">
                <Link
                    href="/product/money/fixed-costs"
                    className="w-fit font-mono text-xs font-medium tracking-wide text-fg-faint uppercase hover:text-accent">
                    ← Fixed costs
                </Link>
                <Typography as="p" size="sm" color="muted">
                    Fixed cost not found.
                </Typography>
            </div>
        );
    }

    const monthly = monthlyAmount(Math.abs(item.amount), item.cadence);
    const linkedTx = settlement?.transactionId
        ? periodTxs.find(tx => tx.id === settlement.transactionId)
        : undefined;
    const status = fixedCostStatus(item, settlement, period);
    const lifecycle = fixedCostLifecycle(item);
    const canSettle = lifecycle === 'active' && isFixedCostCounting(item);
    const settleBusy = settleMutation.isPending;
    const company = item.counterparty?.trim() || item.name;
    const subtitle =
        item.counterparty?.trim() && item.counterparty.trim() !== item.name.trim()
            ? item.name
            : null;
    const mark = partyMark(
        findPartyVendor(company, merchants, givingOrgs),
        catalogMarkChrome({
            billName: item.name,
            jarKey: jar?.key,
            jarByKey,
            categoryTemplates,
        })
    );
    const due = formatDueDay(item.dueDay);
    const signedMonthly =
        item.direction === FlowDirection.IN ? Math.abs(monthly) : -Math.abs(monthly);
    const jarHref = jar?.key ? `/product/money/jars/${jarKeyToSlug(jar.key)}` : null;
    const jarIcon =
        jar?.icon?.trim() || (jar?.key ? jarByKey.get(jar.key)?.icon?.trim() : null) || '◇';
    const jarTone = jar?.key ? bgClassToCssVar(jarChrome(jar.key).color) : null;
    const busy = lifecycleMutation.isPending;

    return (
        <div className="grid animate-rise gap-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="grid gap-3">
                    <Link
                        href="/product/money/fixed-costs"
                        className="w-fit font-mono text-xs font-medium tracking-wide text-fg-faint uppercase hover:text-accent">
                        ← Fixed costs
                    </Link>
                    <div className="flex items-center gap-3">
                        <VendorMark
                            name={mark.name}
                            src={mark.src}
                            fallbackIcon={mark.fallbackIcon}
                            tone={mark.tone}
                            size={40}
                        />
                        <div>
                            <h1 className="text-2xl font-semibold tracking-tight text-fg">
                                {company}
                            </h1>
                            {subtitle ? (
                                <p className="mt-0.5 font-mono text-xs text-fg-muted">{subtitle}</p>
                            ) : null}
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {lifecycle === 'active' ? (
                        <>
                            <Button
                                type="button"
                                variant="secondary"
                                disabled={busy || !live}
                                onClick={openPauseConfirm}>
                                <PauseIcon />
                                Pause
                            </Button>
                            <Button
                                type="button"
                                variant="secondary"
                                disabled={busy || !live}
                                onClick={openEndConfirm}>
                                <EndIcon />
                                End
                            </Button>
                        </>
                    ) : null}
                    {lifecycle === 'paused' ? (
                        <>
                            <Button
                                type="button"
                                variant="secondary"
                                disabled={busy || !live}
                                onClick={() => lifecycleMutation.mutate({ isActive: true })}>
                                <ResumeIcon />
                                Resume
                            </Button>
                            <Button
                                type="button"
                                variant="secondary"
                                disabled={busy || !live}
                                onClick={openEndConfirm}>
                                <EndIcon />
                                End
                            </Button>
                        </>
                    ) : null}
                    {lifecycle === 'ended' ? (
                        <Button
                            type="button"
                            variant="secondary"
                            disabled={busy || !live}
                            onClick={() =>
                                lifecycleMutation.mutate({ isActive: true, endsOn: null })
                            }>
                            <ReactivateIcon />
                            Reactivate
                        </Button>
                    ) : null}
                    <Button as={Link} href={updateHref('fixed', item.id)} variant="secondary">
                        <EditIcon />
                        Edit
                    </Button>
                </div>
            </div>

            <Dialog
                open={confirmKind !== null}
                onOpenChange={open => {
                    if (!open && !busy) setConfirmKind(null);
                }}>
                <DialogContent className="sm:max-w-md">
                    {confirmKind === 'pause' ? (
                        <>
                            <DialogHeader>
                                <DialogTitle>Pause this bill?</DialogTitle>
                                <DialogDescription>
                                    It stays on your list but won&apos;t count toward jar pressure
                                    or “still due” until you resume.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    disabled={busy}
                                    onClick={() => setConfirmKind(null)}>
                                    Cancel
                                </Button>
                                <Button type="button" disabled={busy} onClick={confirmPause}>
                                    <PauseIcon />
                                    {busy ? 'Pausing…' : 'Pause bill'}
                                </Button>
                            </DialogFooter>
                        </>
                    ) : null}
                    {confirmKind === 'end' ? (
                        <>
                            <DialogHeader>
                                <DialogTitle>End this bill?</DialogTitle>
                                <DialogDescription>
                                    It stops counting in your plan. You can reactivate it later if
                                    needed.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-3">
                                <p className="font-mono text-[10px] tracking-wider text-fg-muted uppercase">
                                    When did it end?
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        aria-pressed={endWhen === 'today'}
                                        onClick={() => {
                                            setEndWhen('today');
                                            setEndDate(todayIsoDate());
                                        }}
                                        className={cn(
                                            'rounded-full border px-3 py-1.5 font-mono text-xs transition-colors',
                                            endWhen === 'today'
                                                ? 'border-accent/40 bg-accent-soft text-accent'
                                                : 'border-line bg-raised text-fg-secondary hover:border-accent-hover hover:text-accent'
                                        )}>
                                        Today
                                    </button>
                                    <button
                                        type="button"
                                        aria-pressed={endWhen === 'earlier'}
                                        onClick={() => setEndWhen('earlier')}
                                        className={cn(
                                            'rounded-full border px-3 py-1.5 font-mono text-xs transition-colors',
                                            endWhen === 'earlier'
                                                ? 'border-accent/40 bg-accent-soft text-accent'
                                                : 'border-line bg-raised text-fg-secondary hover:border-accent-hover hover:text-accent'
                                        )}>
                                        Earlier date
                                    </button>
                                </div>
                                {endWhen === 'earlier' ? (
                                    <div className="grid gap-1.5">
                                        <span className="font-mono text-[10px] tracking-wide text-fg-faint uppercase">
                                            End date
                                        </span>
                                        <Calendar
                                            value={endDate}
                                            max={todayIsoDate()}
                                            onSelect={setEndDate}
                                            className="w-full max-w-none"
                                        />
                                    </div>
                                ) : null}
                            </div>
                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    disabled={busy}
                                    onClick={() => setConfirmKind(null)}>
                                    Cancel
                                </Button>
                                <Button type="button" disabled={busy} onClick={confirmEnd}>
                                    <EndIcon />
                                    {busy ? 'Ending…' : 'End bill'}
                                </Button>
                            </DialogFooter>
                        </>
                    ) : null}
                </DialogContent>
            </Dialog>

            <Card className="grid gap-4 p-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <p className="font-mono text-[10px] tracking-wider text-fg-muted uppercase">
                            This period
                        </p>
                        <p className="mt-1 text-2xl font-semibold text-fg">
                            {formatMoney(signedMonthly)}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        <MetaChip
                            className={
                                lifecycle === 'active'
                                    ? 'border-success/30 text-success'
                                    : lifecycle === 'paused'
                                      ? 'border-line text-fg-muted'
                                      : 'border-fg-faint/40 text-fg-faint'
                            }>
                            {lifecycleLabel(lifecycle)}
                        </MetaChip>
                        {lifecycle === 'active' ? (
                            <MetaChip
                                className={
                                    status === 'taken'
                                        ? 'border-success/30 text-success'
                                        : status === 'due'
                                          ? 'border-danger/30 text-danger'
                                          : status === 'skipped'
                                            ? 'border-line text-fg-muted'
                                            : undefined
                                }>
                                {statusLabel(status)}
                            </MetaChip>
                        ) : null}
                    </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    <MetaChip>{cadenceLabel(item.cadence)}</MetaChip>
                    {due ? <MetaChip>{due}</MetaChip> : null}
                    {Math.abs(monthly) !== Math.abs(item.amount) ? (
                        <MetaChip>
                            {formatMoney(item.amount)} / {cadenceLabel(item.cadence).toLowerCase()}
                        </MetaChip>
                    ) : null}
                    {jar && jarHref ? (
                        <Link
                            href={jarHref}
                            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-raised py-0.5 pr-2 pl-1 outline-none hover:border-accent-hover focus-visible:ring-2 focus-visible:ring-accent/25">
                            <span
                                className="grid size-5 place-items-center rounded-md text-[11px]"
                                style={
                                    jarTone
                                        ? { background: jarTone }
                                        : { background: 'var(--color-raised)' }
                                }
                                aria-hidden>
                                {jarIcon}
                            </span>
                            <JarBadge
                                jarKey={jar.key}
                                name={jar.name}
                                className="border-0 bg-transparent p-0"
                            />
                        </Link>
                    ) : jar ? (
                        <JarBadge jarKey={jar.key} name={jar.name} />
                    ) : null}
                </div>
            </Card>

            <Card className="grid gap-3 p-5">
                <p className="font-mono text-[10px] tracking-wider text-fg-muted uppercase">Plan</p>
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                    <div>
                        <dt className="font-mono text-[10px] tracking-wide text-fg-faint uppercase">
                            Amount
                        </dt>
                        <dd className="mt-0.5 text-fg">{formatMoney(Math.abs(item.amount))}</dd>
                    </div>
                    <div>
                        <dt className="font-mono text-[10px] tracking-wide text-fg-faint uppercase">
                            Direction
                        </dt>
                        <dd className="mt-0.5 text-fg">
                            {item.direction === FlowDirection.IN ? 'Money in' : 'Money out'}
                        </dd>
                    </div>
                    {item.endsOn ? (
                        <div>
                            <dt className="font-mono text-[10px] tracking-wide text-fg-faint uppercase">
                                Ends
                            </dt>
                            <dd className="mt-0.5 text-fg">{formatBookedDate(item.endsOn)}</dd>
                        </div>
                    ) : null}
                    {item.note ? (
                        <div className="sm:col-span-2">
                            <dt className="font-mono text-[10px] tracking-wide text-fg-faint uppercase">
                                Note
                            </dt>
                            <dd className="mt-0.5 text-fg-secondary">{item.note}</dd>
                        </div>
                    ) : null}
                </dl>
            </Card>

            {lifecycle === 'active' ? (
                <section className="grid gap-3">
                    <Typography as="h2" variant="eyebrow" color="primary">
                        ✦ This period’s payment
                    </Typography>
                    <Card className="grid gap-0 p-0">
                        {linkedTx ? (
                            <MoneyPartyRow
                                title={linkedTx.counterparty?.trim() || linkedTx.description}
                                subtitle={
                                    linkedTx.counterparty?.trim() &&
                                    linkedTx.description !== linkedTx.counterparty.trim()
                                        ? linkedTx.description
                                        : null
                                }
                                mark={partyMark(
                                    findPartyVendor(
                                        linkedTx.counterparty?.trim() || linkedTx.description,
                                        merchants,
                                        givingOrgs
                                    ),
                                    catalogMarkChrome({
                                        jarKey: jar?.key,
                                        jarByKey,
                                        categoryTemplates,
                                    })
                                )}
                                amount={formatMoney(linkedTx.amount)}
                                amountClassName={linkedTx.amount < 0 ? 'text-fg' : 'text-success'}
                                badges={<MetaChip>{formatBookedDate(linkedTx.bookedOn)}</MetaChip>}
                                href={txDetailHref(linkedTx.id)}
                            />
                        ) : status === 'taken' ? (
                            <Typography as="p" size="sm" color="muted" className="px-5 py-4">
                                Marked paid
                                {settlement?.paidAt
                                    ? ` · ${formatBookedDate(settlement.paidAt.slice(0, 10))}`
                                    : ''}
                                {settlement?.amount !== null && settlement?.amount !== undefined
                                    ? ` · ${formatMoney(settlement.amount)}`
                                    : ''}
                                . No linked transaction yet.
                            </Typography>
                        ) : status === 'skipped' ? (
                            <Typography as="p" size="sm" color="muted" className="px-5 py-4">
                                Skipped for this period — it won&apos;t show as still due.
                            </Typography>
                        ) : (
                            <Typography as="p" size="sm" color="muted" className="px-5 py-4">
                                No payment linked for this period yet.
                            </Typography>
                        )}
                        {canSettle ? (
                            <div className="flex flex-wrap gap-2 border-t border-line px-5 py-3">
                                {status !== 'taken' ? (
                                    <Button
                                        type="button"
                                        disabled={settleBusy || !live}
                                        onClick={() => settleMutation.mutate('paid')}>
                                        Mark paid
                                    </Button>
                                ) : null}
                                {status !== 'skipped' ? (
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        disabled={settleBusy || !live}
                                        onClick={() => settleMutation.mutate('skip')}>
                                        Skip period
                                    </Button>
                                ) : null}
                                {settlement ? (
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        disabled={settleBusy || !live}
                                        onClick={() => settleMutation.mutate('unlink')}>
                                        Reopen period
                                    </Button>
                                ) : null}
                            </div>
                        ) : null}
                    </Card>
                </section>
            ) : null}

            {item.debtId ? (
                <section className="grid gap-3">
                    <Typography as="h2" variant="eyebrow" color="primary">
                        ✦ Linked debt
                    </Typography>
                    <Card className="p-0">
                        <Link
                            href={debtDetailHref(item.debtId)}
                            className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-raised">
                            <span className="text-sm text-fg">Open linked debt</span>
                            <span className="font-mono text-xs text-accent uppercase">Open ›</span>
                        </Link>
                    </Card>
                </section>
            ) : null}
        </div>
    );
}
