'use client';

import { api } from '@/app/_lib/api';
import { useApiError } from '@/app/_lib/api-error-messages';
import { apiQuery } from '@/app/_lib/api-hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

import { FlowDirection } from '@rumtelo/contracts';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import { useLiveQuery } from '@rumtelo/hooks';
import {
    Icon,
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

function statusLabel(
    status: ReturnType<typeof fixedCostStatus>,
    t: ReturnType<typeof useTranslations<'features.money.fixed'>>
) {
    if (status === 'taken') return t('detail_status_taken');
    if (status === 'due') return t('detail_status_due');
    if (status === 'skipped') return t('detail_status_skipped');
    return t('detail_status_planned');
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
    const locale = useLocale();
    const t = useTranslations('features.money.fixed');
    const tUi = useTranslations();
    const tForm = useTranslations('ui.form');
    const tAction = useTranslations('common.action');
    const tChips = useTranslations('features.money.chips');
    const { period, showToast } = useAppShell();
    const apiError = useApiError();
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
            if (patch.isActive) showToast(t('toast_active'), 'success');
            else if (patch.endsOn) showToast(t('toast_ended'), 'success');
            else showToast(t('toast_paused'), 'success');
        },
        onError: (error: unknown) => showToast(apiError(error), 'error'),
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
            if (action === 'paid') showToast(t('toast_paid'), 'success');
            else if (action === 'skip') showToast(t('toast_skipped'), 'success');
            else showToast(t('toast_reopened'), 'success');
        },
        onError: (error: unknown) => showToast(apiError(error), 'error'),
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
            showToast(t('toast_pick_date'), 'error');
            return;
        }
        lifecycleMutation.mutate({ isActive: false, endsOn });
    }

    if (live && listQuery.isLoading && !item) {
        return (
            <Typography as="p" size="sm" color="muted">
                {t('detail.loading')}
            </Typography>
        );
    }
    if (!item) {
        return (
            <div className="grid gap-4">
                <Link
                    href="/product/money/fixed-costs"
                    className="w-fit font-mono text-xs font-medium tracking-wide text-fg-faint uppercase hover:text-accent">
                    {t('detail.back')}
                </Link>
                <Typography as="p" size="sm" color="muted">
                    {t('detail.not_found')}
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
    const due = formatDueDay(item.dueDay, tChips);
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
                        {t('detail.back')}
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
                                <Icon name="pause" size="sm" appearance="filled" />
                                {t('pause_short')}
                            </Button>
                            <Button
                                type="button"
                                variant="secondary"
                                disabled={busy || !live}
                                onClick={openEndConfirm}>
                                <Icon name="square" size="sm" appearance="filled" />
                                {t('end_short')}
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
                                <Icon name="play" size="sm" appearance="filled" />
                                {t('resume_short')}
                            </Button>
                            <Button
                                type="button"
                                variant="secondary"
                                disabled={busy || !live}
                                onClick={openEndConfirm}>
                                <Icon name="square" size="sm" appearance="filled" />
                                {t('end_short')}
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
                            <Icon name="refresh-cw" size="sm" />
                            {t('reactivate_short')}
                        </Button>
                    ) : null}
                    <Button as={Link} href={updateHref('fixed', item.id)} variant="secondary">
                        <Icon name="pencil" size="sm" />
                        {tAction('edit')}
                    </Button>
                </div>
            </div>

            <Dialog
                open={confirmKind !== null}
                onOpenChange={open => {
                    if (!open && !busy) setConfirmKind(null);
                }}>
                <DialogContent className="sm:max-w-md" closeLabel={tUi('ui.button.actions.close')}>
                    {confirmKind === 'pause' ? (
                        <>
                            <DialogHeader>
                                <DialogTitle>{t('confirm_pause_title')}</DialogTitle>
                                <DialogDescription>{t('confirm_pause_body')}</DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    disabled={busy}
                                    onClick={() => setConfirmKind(null)}>
                                    {tAction('cancel')}
                                </Button>
                                <Button type="button" disabled={busy} onClick={confirmPause}>
                                    <Icon name="pause" size="sm" appearance="filled" />
                                    {busy ? t('pausing') : t('pause_bill')}
                                </Button>
                            </DialogFooter>
                        </>
                    ) : null}
                    {confirmKind === 'end' ? (
                        <>
                            <DialogHeader>
                                <DialogTitle>{t('confirm_end_title')}</DialogTitle>
                                <DialogDescription>{t('confirm_end_body')}</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-3">
                                <p className="font-mono text-[10px] tracking-wider text-fg-muted uppercase">
                                    {t('when_ended')}
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
                                        {t('today')}
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
                                        {t('earlier_date')}
                                    </button>
                                </div>
                                {endWhen === 'earlier' ? (
                                    <div className="grid gap-1.5">
                                        <span className="font-mono text-[10px] tracking-wide text-fg-faint uppercase">
                                            {t('end_date')}
                                        </span>
                                        <Calendar
                                            value={endDate}
                                            max={todayIsoDate()}
                                            onSelect={setEndDate}
                                            locale={locale}
                                            className="w-full max-w-none"
                                            labels={{
                                                previousMonth: tForm('previous_month'),
                                                nextMonth: tForm('next_month'),
                                                month: tForm('month'),
                                                year: tForm('year'),
                                                today: tForm('today'),
                                                pickADay: tForm('pick_a_day'),
                                            }}
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
                                    {tAction('cancel')}
                                </Button>
                                <Button type="button" disabled={busy} onClick={confirmEnd}>
                                    <Icon name="square" size="sm" appearance="filled" />
                                    {busy ? t('ending') : t('end_bill')}
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
                            {t('this_period')}
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
                            {lifecycleLabel(lifecycle, {
                                active: t('lifecycle_active'),
                                paused: t('lifecycle_paused'),
                                ended: t('lifecycle_ended'),
                            })}
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
                                {statusLabel(status, t)}
                            </MetaChip>
                        ) : null}
                    </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    <MetaChip>{cadenceLabel(item.cadence, tChips)}</MetaChip>
                    {due ? <MetaChip>{due}</MetaChip> : null}
                    {Math.abs(monthly) !== Math.abs(item.amount) ? (
                        <MetaChip>
                            {tChips('amount_per_cadence', {
                                amount: formatMoney(item.amount),
                                cadence: cadenceLabel(item.cadence, tChips, { case: 'lower' }),
                            })}
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
                <p className="font-mono text-[10px] tracking-wider text-fg-muted uppercase">
                    {t('detail.plan_heading')}
                </p>
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                    <div>
                        <dt className="font-mono text-[10px] tracking-wide text-fg-faint uppercase">
                            {t('detail.amount')}
                        </dt>
                        <dd className="mt-0.5 text-fg">{formatMoney(Math.abs(item.amount))}</dd>
                    </div>
                    <div>
                        <dt className="font-mono text-[10px] tracking-wide text-fg-faint uppercase">
                            {t('detail.direction')}
                        </dt>
                        <dd className="mt-0.5 text-fg">
                            {item.direction === FlowDirection.IN
                                ? t('detail.money_in')
                                : t('detail.money_out')}
                        </dd>
                    </div>
                    {item.endsOn ? (
                        <div>
                            <dt className="font-mono text-[10px] tracking-wide text-fg-faint uppercase">
                                {t('detail.ends')}
                            </dt>
                            <dd className="mt-0.5 text-fg">
                                {formatBookedDate(item.endsOn, locale)}
                            </dd>
                        </div>
                    ) : null}
                    {item.note ? (
                        <div className="sm:col-span-2">
                            <dt className="font-mono text-[10px] tracking-wide text-fg-faint uppercase">
                                {t('detail.note')}
                            </dt>
                            <dd className="mt-0.5 text-fg-secondary">{item.note}</dd>
                        </div>
                    ) : null}
                </dl>
            </Card>

            {lifecycle === 'active' ? (
                <section className="grid gap-3">
                    <Typography as="h2" variant="eyebrow" color="primary">
                        {t('detail.period_heading')}
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
                                badges={
                                    <MetaChip>
                                        {formatBookedDate(linkedTx.bookedOn, locale)}
                                    </MetaChip>
                                }
                                href={txDetailHref(linkedTx.id)}
                            />
                        ) : status === 'taken' ? (
                            <Typography as="p" size="sm" color="muted" className="px-5 py-4">
                                {t('detail.marked_paid')}
                                {settlement?.paidAt
                                    ? ` · ${formatBookedDate(settlement.paidAt.slice(0, 10), locale)}`
                                    : ''}
                                {settlement?.amount !== null && settlement?.amount !== undefined
                                    ? ` · ${formatMoney(settlement.amount)}`
                                    : ''}
                                . {t('detail.no_linked_tx')}
                            </Typography>
                        ) : status === 'skipped' ? (
                            <Typography as="p" size="sm" color="muted" className="px-5 py-4">
                                {t('detail.skipped_period')}
                            </Typography>
                        ) : (
                            <Typography as="p" size="sm" color="muted" className="px-5 py-4">
                                {t('detail.no_payment_linked')}
                            </Typography>
                        )}
                        {canSettle ? (
                            <div className="flex flex-wrap gap-2 border-t border-line px-5 py-3">
                                {status !== 'taken' ? (
                                    <Button
                                        type="button"
                                        disabled={settleBusy || !live}
                                        onClick={() => settleMutation.mutate('paid')}>
                                        {t('detail.mark_paid')}
                                    </Button>
                                ) : null}
                                {status !== 'skipped' ? (
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        disabled={settleBusy || !live}
                                        onClick={() => settleMutation.mutate('skip')}>
                                        {t('detail.skip_period')}
                                    </Button>
                                ) : null}
                                {settlement ? (
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        disabled={settleBusy || !live}
                                        onClick={() => settleMutation.mutate('unlink')}>
                                        {t('detail.reopen_period')}
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
                        {t('detail.linked_debt_heading')}
                    </Typography>
                    <Card className="p-0">
                        <Link
                            href={debtDetailHref(item.debtId)}
                            className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-raised">
                            <span className="text-sm text-fg">{t('detail.open_linked_debt')}</span>
                            <span className="font-mono text-xs text-accent uppercase">
                                {t('detail.open_link')}
                            </span>
                        </Link>
                    </Card>
                </section>
            ) : null}
        </div>
    );
}
