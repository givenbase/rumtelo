'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
    HouseholdRole,
    type MonthCloseBillDisposition,
    type MonthCloseDueBill,
} from '@rumtelo/contracts';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import { Button, Sheet, SheetContent, SheetHeader, SheetTitle, Typography } from '@rumtelo/ui';
import { formatPeriod, parsePeriodKey } from '@rumtelo/utils';

import { api } from '@/app/_lib/api';
import { useApiError, useApiErrorFallbacks } from '@/app/_lib/api-error-messages';
import { apiQuery } from '@/app/_lib/api-hooks';
import { resolveCloseStep, type CloseStep } from '@/app/_lib/close-month-steps';
import { monthScoreRecapHeadline } from '@/app/_lib/month-score-copy';
import { isLiveData } from '@/app/_lib/preview';
import { moneyPath } from '@/app/_lib/routes';
import { useBoardWriteAccess } from '@/app/_lib/use-board-write-access';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import { useAuth } from '@/components/features/shell/auth-provider';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';

import { CloseMonthBills, type BillAction } from './close-month-bills';

const PRIMARY = 'h-12 w-full md:h-10 md:w-auto';

type Retarget = { target: string; period: string; priorDone: string | null };

/**
 * Close a month from where the person is (G-1): Home's next move or the month score.
 * One sheet picks the first step that applies: an earlier month, then the Inbox, then the
 * bills, then a plain confirmation. The server enforces all of it; the sheet only orders
 * the work. It never changes the selected period, except "Sort them", which leaves Home to
 * work on that month. Calendar months throughout, as the server counts them.
 */
export function CloseMonthFlow({
    open,
    onOpenChange,
    target,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Month the person asked to close (`YYYY-MM`). The flow may visit earlier months first. */
    target: string | null;
}) {
    const t = useTranslations('pages.dashboard');
    const tUi = useTranslations('ui.button.actions');
    const locale = useLocale();
    const router = useRouter();
    const queryClient = useQueryClient();
    const apiError = useApiError();
    const fallbacks = useApiErrorFallbacks();
    const { householdId } = useAuth();
    const { setPeriod, showToast } = useHouseholdShell();
    const { role, practicePreview } = useBoardWriteAccess();
    const { formatMoney } = useHouseholdCurrency();
    const titleRef = useRef<HTMLHeadingElement>(null);
    const reasonId = useId();

    const [retarget, setRetarget] = useState<Retarget | null>(null);
    const current = retarget && retarget.target === target ? retarget : null;
    const period = current?.period ?? target;
    const priorDone = current?.priorDone ?? null;

    const canAct = !practicePreview && role !== HouseholdRole.VIEWER;
    const live = isLiveData(householdId);

    const scoreQuery = useQuery({
        ...apiQuery.money.monthScore.current.queryOptions({
            input: { householdId: householdId!, period: period ?? undefined },
        }),
        enabled: open && live && canAct && Boolean(period),
    });
    const score = scoreQuery.data;
    // Never act on another month's blockers while the new step is loading.
    const step: CloseStep | null =
        score && score.period === period ? resolveCloseStep(score) : null;

    const closeMonth = useMutation({
        mutationFn: async (billDispositions?: MonthCloseBillDisposition[]) => {
            if (!householdId || !period) throw new Error('No household');
            return api.money.monthScore.close({ householdId, period, billDispositions });
        },
        onSuccess: recap => {
            for (const queryKey of [
                apiQuery.money.dashboard.get.key(),
                apiQuery.money.progress.key(),
                apiQuery.money.monthScore.current.key(),
                apiQuery.money.fixedCosts.listSettlements.key(),
                apiQuery.money.debts.list.key(),
            ]) {
                void queryClient.invalidateQueries({ queryKey });
            }
            showToast(
                t('month_closed_toast', {
                    recap: monthScoreRecapHeadline(
                        t,
                        recap.headlineKey,
                        formatMoney,
                        recap.leftOver
                    ),
                }),
                'success'
            );
            if (target && period && period !== target) {
                // We closed an earlier month on the way: carry on with the one asked for.
                setRetarget({ target, period: target, priorDone: period });
            } else {
                handleOpenChange(false);
            }
        },
    });

    function handleOpenChange(next: boolean) {
        onOpenChange(next);
        if (!next) {
            setRetarget(null);
            closeMonth.reset();
        }
    }

    function goTo(nextPeriod: string, priorDoneFrom: string | null = null) {
        if (!target) return;
        closeMonth.reset();
        setRetarget({ target, period: nextPeriod, priorDone: priorDoneFrom });
    }

    function sortThem() {
        if (!period) return;
        handleOpenChange(false);
        setPeriod(parsePeriodKey(period));
        router.push(moneyPath('transactions'));
    }

    // The title is the first thing read: on open and again on every step change.
    useEffect(() => {
        if (open && period) titleRef.current?.focus();
    }, [open, period]);

    if (!canAct) return null;

    const month = period ? formatPeriod(period, locale) : '';
    const closeError = closeMonth.isError
        ? (() => {
              const message = apiError(closeMonth.error);
              return message === fallbacks.generic
                  ? t('close_flow.close_error_fallback', { month })
                  : message;
          })()
        : null;

    const notNow = (
        <Button
            type="button"
            variant="ghost"
            className={PRIMARY}
            disabled={closeMonth.isPending}
            onClick={() => handleOpenChange(false)}>
            {t('close_flow.not_now')}
        </Button>
    );
    const closeButton = (disabledReason?: string) => (
        <Button
            type="button"
            data-mutate
            variant={disabledReason ? 'secondary' : 'primary'}
            className={PRIMARY}
            aria-disabled={disabledReason ? true : undefined}
            aria-describedby={disabledReason ? reasonId : undefined}
            disabled={closeMonth.isPending}
            onClick={() => {
                if (!disabledReason) closeMonth.mutate(undefined);
            }}>
            {closeMonth.isPending ? t('closing') : t('close_flow.close_cta', { month })}
        </Button>
    );
    const errorBlock = closeError ? (
        <p role="alert" className="text-sm text-pretty text-danger">
            {closeError}
        </p>
    ) : null;

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetContent
                side="bottom"
                aria-describedby={undefined}
                closeLabel={t('close_flow.not_now')}
                onOpenAutoFocus={event => {
                    event.preventDefault();
                    titleRef.current?.focus();
                }}
                className="max-h-[85dvh] gap-0 overflow-y-auto rounded-t-2xl pb-[env(safe-area-inset-bottom)] md:inset-x-auto md:inset-y-0 md:right-0 md:h-full md:max-h-none md:w-full md:max-w-md md:rounded-none md:border-t-0 md:border-l">
                <SheetHeader className="border-b border-line px-5 pt-5 pr-14 pb-4 text-left">
                    <SheetTitle ref={titleRef} tabIndex={-1} className="text-xl leading-snug">
                        {t('close_flow.title', { month })}
                    </SheetTitle>
                </SheetHeader>

                <div className="grid gap-4 px-5 py-5">
                    {priorDone ? (
                        <p role="status" className="text-sm text-pretty text-fg-secondary">
                            {t('close_flow.prior_done', { month: formatPeriod(priorDone, locale) })}
                        </p>
                    ) : null}

                    {scoreQuery.isError && !step ? (
                        <>
                            <p role="alert" className="text-sm text-pretty text-fg">
                                {t('close_flow.load_error', { month })}
                            </p>
                            <Button
                                type="button"
                                variant="secondary"
                                className={PRIMARY}
                                onClick={() => void scoreQuery.refetch()}>
                                {tUi('try_again')}
                            </Button>
                            {notNow}
                        </>
                    ) : !step ? (
                        <div aria-busy="true" className="grid gap-3">
                            <div className="h-4 w-3/4 rounded bg-sunken" />
                            <div className="h-12 w-full rounded-full bg-sunken md:h-10 md:w-40" />
                        </div>
                    ) : step.kind === 'ALREADY_CLOSED' ? (
                        <>
                            <Typography as="p" size="sm" className="text-pretty">
                                {t('close_flow.already_closed', { month })}
                            </Typography>
                            <Button
                                type="button"
                                className={PRIMARY}
                                onClick={() => handleOpenChange(false)}>
                                {t('close_flow.done')}
                            </Button>
                        </>
                    ) : step.kind === 'PRIOR_FIRST' ? (
                        <>
                            <Typography as="p" size="sm" className="text-pretty">
                                {t('close_flow.prior_first', {
                                    prior: formatPeriod(step.prior, locale),
                                })}
                            </Typography>
                            <Button
                                type="button"
                                className={PRIMARY}
                                onClick={() => goTo(step.prior)}>
                                {t('close_flow.prior_first_cta', {
                                    prior: formatPeriod(step.prior, locale),
                                })}
                            </Button>
                            {notNow}
                        </>
                    ) : step.kind === 'INBOX_FIRST' ? (
                        <>
                            <Typography as="p" size="sm" className="text-pretty">
                                {t('close_flow.inbox_first', { count: step.count, month })}
                            </Typography>
                            <Button type="button" className={PRIMARY} onClick={sortThem}>
                                {t('close_flow.inbox_first_cta')}
                            </Button>
                            {closeButton(t('close_flow.inbox_first_reason'))}
                            <p id={reasonId} className="text-xs text-pretty text-fg-muted">
                                {t('close_flow.inbox_first_reason')}
                            </p>
                            {notNow}
                        </>
                    ) : step.kind === 'BILLS' ? (
                        <BillsStep
                            // A fresh choice list for each month; a retry keeps the choices.
                            key={period}
                            bills={step.bills}
                            pending={closeMonth.isPending}
                            error={errorBlock}
                            formatMoney={formatMoney}
                            closeLabel={
                                closeMonth.isPending
                                    ? t('closing')
                                    : t('close_flow.close_cta', { month })
                            }
                            onConfirm={dispositions => closeMonth.mutate(dispositions)}
                            notNow={notNow}
                        />
                    ) : (
                        <>
                            <Typography as="p" size="sm" className="text-pretty">
                                {t('close_flow.confirm_body')}
                            </Typography>
                            {errorBlock}
                            {closeButton()}
                            {notNow}
                        </>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}

function BillsStep({
    bills,
    pending,
    error,
    formatMoney,
    closeLabel,
    onConfirm,
    notNow,
}: {
    bills: readonly MonthCloseDueBill[];
    pending: boolean;
    error: React.ReactNode;
    formatMoney: (cents: number) => string;
    closeLabel: string;
    onConfirm: (dispositions: MonthCloseBillDisposition[]) => void;
    notNow: React.ReactNode;
}) {
    const t = useTranslations('pages.dashboard');
    const [actions, setActions] = useState<Record<string, BillAction>>({});

    return (
        <>
            <div className="grid gap-1">
                <Typography as="h3" weight="semibold" className="text-base">
                    {t('close_bills_title')}
                </Typography>
                <Typography as="p" size="sm" color="secondary" className="text-pretty">
                    {t('close_bills_body')}
                </Typography>
            </div>
            <CloseMonthBills
                bills={bills}
                actions={actions}
                pending={pending}
                formatMoney={formatMoney}
                onChange={(fixedCostId, action) =>
                    setActions(previous => ({ ...previous, [fixedCostId]: action }))
                }
            />
            <Typography as="p" size="sm" color="muted" className="text-pretty">
                {t('close_flow.bills_tail')}
            </Typography>
            {error}
            <Button
                type="button"
                data-mutate
                className={PRIMARY}
                disabled={pending}
                onClick={() =>
                    onConfirm(
                        bills.map(bill => ({
                            fixedCostId: bill.fixedCostId,
                            action: actions[bill.fixedCostId] ?? 'roll',
                        }))
                    )
                }>
                {closeLabel}
            </Button>
            {notNow}
        </>
    );
}
