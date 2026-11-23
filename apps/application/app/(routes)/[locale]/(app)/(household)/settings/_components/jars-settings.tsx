'use client';

import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import {
    DEFAULT_JAR_SPLIT,
    JAR_GROUP_ORDER,
    SpendingStyle,
    sumPercentageByGroup,
} from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import { Badge, Button, Input, Meter, StubNotice, VendorMark } from '@rumtelo/ui';
import { cn, formatIban, formatPercent, sumMonthly } from '@rumtelo/utils';

import { useApiError } from '@/app/_lib/api-error-messages';
import { resolveJarName } from '@/app/_lib/jar-copy';
import {
    GROUP_CHROME,
    formatShare,
    groupSlug,
    jarsInGroup,
    orderJarsByGroup,
} from '@/app/_lib/jar-group';
import { isLiveData } from '@/app/_lib/preview';
import { evaluateSplitCoach, orderSplitTips, pctByJarKey } from '@/app/_lib/split-coach';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import { HelperGate } from '@/components/features/helpers';
import { BankAccountRow } from '@/components/features/money/bank-account-row';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';
import { accountBankMark, countryFromCurrency } from '../_utils/resolve-account-bank';
import { JAR_COLOR, accountKindLabel } from '../_utils/settings-shared';
import { SettingsInkCard, SettingsPanel, SettingsPill, SettingsRow } from './settings-chrome';

type JarsSettingsValues = {
    pct: Record<string, number>;
    jarSeats: Record<string, string>;
};

export function JarsSettings() {
    const t = useTranslations();
    const tJars = useTranslations('features.money.jars');
    const locale = useLocale();
    const queryClient = useQueryClient();
    const { householdId } = useAuth();
    const { showToast } = useHouseholdShell();
    const apiError = useApiError();
    const { formatMoney } = useHouseholdCurrency();
    const live = isLiveData(householdId);

    const accountSettingsQuery = useLiveQuery(apiQuery.account.settings.queryOptions(), null, live);

    const jarsQuery = useLiveQuery(
        apiQuery.money.jars.list.queryOptions({ input: { householdId: householdId! } }),
        [] as never,
        live
    );

    const accountsQuery = useLiveQuery(
        apiQuery.money.accounts.list.queryOptions({ input: { householdId: householdId! } }),
        [],
        live
    );

    const settingsQuery = useLiveQuery(
        apiQuery.household.settings.queryOptions({ input: { householdId: householdId! } }),
        null,
        live
    );
    const banksQuery = useLiveQuery(
        apiQuery.money.catalogs.banks.list.queryOptions({
            input: {
                householdId: householdId!,
                country: countryFromCurrency(settingsQuery.data?.currency),
            },
        }),
        [],
        live
    );
    const banks = useMemo(() => banksQuery.data ?? [], [banksQuery.data]);

    // Pots always list in group order (Basics, Future, Free), whatever order the API sent.
    const jars = useMemo(() => orderJarsByGroup(jarsQuery.data ?? []), [jarsQuery.data]);
    const accounts = useMemo(() => accountsQuery.data ?? [], [accountsQuery.data]);
    const serverPct = useMemo(
        () => Object.fromEntries(jars.map(j => [j.id, j.percentage])),
        [jars]
    );

    /** Seats as stored server-side on each jar's defaultAccountId. */
    const serverJarSeats = useMemo(
        () =>
            Object.fromEntries(
                jars
                    .filter(j => j.defaultAccountId !== null)
                    .map(j => [j.id, j.defaultAccountId as string])
            ),
        [jars]
    );

    const form = useForm<JarsSettingsValues>({
        defaultValues: { pct: {}, jarSeats: {} },
    });
    const pctWatch = useWatch({ control: form.control, name: 'pct' });
    const jarSeatsWatch = useWatch({ control: form.control, name: 'jarSeats' });
    const pct = useMemo(() => pctWatch ?? {}, [pctWatch]);
    const jarSeats = useMemo(() => jarSeatsWatch ?? {}, [jarSeatsWatch]);

    useEffect(() => {
        if (jars.length === 0) return;
        if (form.formState.isDirty) return;
        form.reset({ pct: serverPct, jarSeats: serverJarSeats });
    }, [form, jars.length, serverPct, serverJarSeats]);

    const [dismissedTips, setDismissedTips] = useState<Record<string, true>>({});
    const [showAllTips, setShowAllTips] = useState(false);
    const [editingJarId, setEditingJarId] = useState<string | null>(null);

    const total = Object.values(pct).reduce((running, value) => running + value, 0);
    // The server accepts a split only when it adds up to exactly 10 000 basis points, so compare
    // the same rounded integers here — Save is enabled only when the server will take it.
    const totalBasisPoints = Object.values(pct).reduce(
        (running, value) => running + Math.round(value * 100),
        0
    );
    const balanced = totalBasisPoints === 10_000;
    // Live group subtotals follow the inputs, in basis points so they add up without drift.
    const groupShares = sumPercentageByGroup(
        jars.map(jar => ({ key: jar.key, percentage: pct[jar.id] ?? jar.percentage }))
    );

    // A household with no pot in a group gets no empty section for it.
    const visibleGroups = JAR_GROUP_ORDER.filter(group => jarsInGroup(jars, group).length > 0);

    // Only show seats that still exist in the current accounts list — stale IDs are dropped.
    const effectiveJarSeats = useMemo(() => {
        const validIds = new Set(accounts.map(account => account.id));
        const next: Record<string, string> = {};
        for (const [jarId, accountId] of Object.entries(jarSeats)) {
            if (validIds.has(accountId)) next[jarId] = accountId;
        }
        return next;
    }, [jarSeats, accounts]);

    const coachTips = (() => {
        const spendingStyle = accountSettingsQuery.data?.spendingStyle ?? SpendingStyle.UNKNOWN;
        const tips = orderSplitTips(evaluateSplitCoach(pctByJarKey(jars, pct), spendingStyle));
        return tips.filter(tip => !dismissedTips[tip.id]);
    })();

    const incomeQuery = useLiveQuery(
        apiQuery.money.income.list.queryOptions({ input: { householdId: householdId! } }),
        [],
        live
    );
    const monthlyNet = useMemo(() => sumMonthly(incomeQuery.data ?? []), [incomeQuery.data]);

    const saveSplit = useMutation({
        mutationFn: async () => {
            if (!householdId) throw new Error('No household');
            return api.money.jars.updateSplit({
                householdId,
                split: Object.entries(pct).map(([jarId, percentage]) => ({ jarId, percentage })),
            });
        },
        onSuccess: () => {
            form.reset({ pct: form.getValues('pct'), jarSeats: form.getValues('jarSeats') });
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.jars.list.key() });
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.jars.balances.key() });
            showToast(t('pages.settings.toasts.split_saved'), 'success');
        },
        onError: (error: unknown) => showToast(apiError(error), 'error'),
    });

    function resetDefaults() {
        const next: Record<string, number> = {};
        for (const jar of jars) {
            next[jar.id] = DEFAULT_JAR_SPLIT[jar.key] ?? jar.percentage;
        }
        form.setValue('pct', next, { shouldDirty: true });
        setDismissedTips({});
    }

    function seatAccount(accountId: string | undefined) {
        if (!accountId) return null;
        return accounts.find(item => item.id === accountId) ?? null;
    }

    return (
        <SettingsPanel>
            <SettingsInkCard
                eyebrow={t('pages.settings.panels.jars_placement.eyebrow')}
                blurb={t('pages.settings.panels.jars_placement.blurb')}
                badge={
                    <SettingsPill tone="accent">
                        {accounts.length
                            ? t(
                                  accounts.length === 1
                                      ? 'pages.settings.panels.jars_placement.accounts_one'
                                      : 'pages.settings.panels.jars_placement.accounts_other',
                                  { count: accounts.length }
                              )
                            : t('pages.settings.panels.jars_placement.no_accounts')}
                    </SettingsPill>
                }>
                {jars.map((jar, i) => {
                    const seatId = effectiveJarSeats[jar.id];
                    const account = seatAccount(seatId);
                    const mark = account ? accountBankMark(account, banks) : null;
                    const ibanLabel = account?.iban ? formatIban(account.iban) : null;
                    const isEditing = editingJarId === jar.id;
                    return (
                        <div
                            key={jar.id}
                            className={cn(i < jars.length - 1 && 'border-b border-line')}>
                            <SettingsRow last>
                                <span className="flex min-w-0 items-center gap-3">
                                    <span
                                        className={cn(
                                            'size-2 shrink-0 rounded-sm',
                                            JAR_COLOR[jar.key] ?? 'bg-accent'
                                        )}
                                    />
                                    <span className="grid min-w-0 gap-0.5">
                                        <span className="text-sm text-fg">
                                            {resolveJarName(tJars, jar.key, jar.name)}
                                        </span>
                                        {account ? (
                                            <span className="flex min-w-0 items-center gap-1.5">
                                                {mark ? (
                                                    <VendorMark
                                                        name={mark.name}
                                                        src={mark.src}
                                                        size={16}
                                                    />
                                                ) : null}
                                                <span className="min-w-0 truncate font-mono text-[10px] text-fg-secondary">
                                                    {account.name}
                                                    {ibanLabel ? ` · ${ibanLabel}` : ''}
                                                </span>
                                            </span>
                                        ) : (
                                            <span className="font-mono text-[10px] text-warning">
                                                {t('pages.settings.panels.jars_placement.not_set')}
                                            </span>
                                        )}
                                    </span>
                                </span>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="rounded-full font-mono text-[10px] tracking-[0.12em] uppercase"
                                    disabled={accounts.length === 0}
                                    onClick={() =>
                                        setEditingJarId(current =>
                                            current === jar.id ? null : jar.id
                                        )
                                    }>
                                    {isEditing
                                        ? t('pages.settings.panels.jars_placement.close')
                                        : t('pages.settings.panels.jars_placement.change')}
                                </Button>
                            </SettingsRow>
                            {isEditing ? (
                                <div
                                    role="radiogroup"
                                    className="grid gap-1.5 pb-3 pl-5"
                                    aria-label={t('pages.settings.panels.jars_placement.change')}>
                                    {accounts.map(option => (
                                        <BankAccountRow
                                            key={option.id}
                                            account={option}
                                            banks={banks}
                                            markSize={18}
                                            selected={seatId === option.id}
                                            sub={`${accountKindLabel(option.kind, t) ?? option.kind}${
                                                option.iban ? ` · ${formatIban(option.iban)}` : ''
                                            }`}
                                            onSelect={() => {
                                                form.setValue(
                                                    'jarSeats',
                                                    {
                                                        ...form.getValues('jarSeats'),
                                                        [jar.id]: option.id,
                                                    },
                                                    { shouldDirty: true }
                                                );
                                                setEditingJarId(null);
                                                // Persist placement immediately.
                                                if (householdId) {
                                                    void api.money.jars
                                                        .updatePlacement({
                                                            householdId,
                                                            placements: [
                                                                {
                                                                    jarId: jar.id,
                                                                    accountId: option.id,
                                                                },
                                                            ],
                                                        })
                                                        .then(() => {
                                                            void queryClient.invalidateQueries({
                                                                queryKey:
                                                                    apiQuery.money.jars.list.key(),
                                                            });
                                                        })
                                                        .catch((error: unknown) => {
                                                            showToast(apiError(error), 'error');
                                                        });
                                                }
                                                showToast(
                                                    t(
                                                        'pages.settings.panels.jars_placement.seat_saved',
                                                        {
                                                            jar: resolveJarName(
                                                                tJars,
                                                                jar.key,
                                                                jar.name
                                                            ),
                                                            account: option.name,
                                                        }
                                                    ),
                                                    'success'
                                                );
                                            }}
                                        />
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    );
                })}
            </SettingsInkCard>

            <SettingsInkCard
                eyebrow={t('pages.settings.panels.income_split.eyebrow')}
                blurb={t('pages.settings.panels.income_split.blurb')}
                badge={
                    <Badge tone={balanced ? 'success' : 'danger'}>{formatPercent(total)}</Badge>
                }>
                <div className="grid gap-0">
                    {visibleGroups.map((group, groupIndex) => {
                        const groupJars = jarsInGroup(jars, group);
                        const headingId = `split-group-${groupSlug(group)}`;
                        return (
                            <section
                                key={group}
                                aria-labelledby={headingId}
                                className={cn(groupIndex > 0 && 'mt-2 border-t border-line pt-2')}>
                                <header className="flex min-w-0 items-center justify-between gap-3 py-1.5">
                                    <span className="flex min-w-0 items-center gap-2">
                                        <span
                                            aria-hidden
                                            className={cn(
                                                'grid size-5 shrink-0 place-items-center rounded-full border border-line bg-raised font-mono text-[11px] font-semibold',
                                                GROUP_CHROME[group].text
                                            )}>
                                            {groupIndex + 1}
                                        </span>
                                        <span className="min-w-0">
                                            <span
                                                id={headingId}
                                                className="block text-sm font-semibold text-fg">
                                                {t(`features.money.groups.${group}.title`)}
                                            </span>
                                            <span className="block text-xs leading-snug text-fg-muted">
                                                {t(`features.money.groups.${group}.line`)}
                                            </span>
                                        </span>
                                    </span>
                                    <span className="shrink-0 font-mono text-sm font-medium whitespace-nowrap text-fg tabular-nums">
                                        {formatShare(groupShares[group], locale)}%
                                    </span>
                                </header>
                                {groupJars.map((jar, i) => {
                                    const value = pct[jar.id] ?? jar.percentage;
                                    const allocated = Math.round((monthlyNet * value) / 100);
                                    const name = resolveJarName(tJars, jar.key, jar.name);
                                    return (
                                        <div
                                            key={jar.id}
                                            className={cn(
                                                'grid gap-1.5 py-2',
                                                i < groupJars.length - 1 && 'border-b border-line'
                                            )}>
                                            {/* Below sm the label gets its own line and wraps, so a long Dutch pot name is never clipped; the controls sit under it. */}
                                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                                                <span className="flex min-w-0 basis-full items-center gap-2 sm:flex-1 sm:basis-0">
                                                    <span
                                                        className={cn(
                                                            'size-1.5 shrink-0 rounded-sm',
                                                            JAR_COLOR[jar.key] ?? 'bg-accent'
                                                        )}
                                                    />
                                                    <label
                                                        htmlFor={`pct-${jar.id}`}
                                                        className="min-w-0 text-sm break-words text-fg">
                                                        {name}
                                                    </label>
                                                </span>
                                                <Input
                                                    id={`pct-${jar.id}`}
                                                    type="number"
                                                    min={0}
                                                    max={100}
                                                    step={0.5}
                                                    value={value}
                                                    onChange={event =>
                                                        form.setValue(
                                                            'pct',
                                                            {
                                                                ...pct,
                                                                [jar.id]:
                                                                    Number(event.target.value) || 0,
                                                            },
                                                            { shouldDirty: true }
                                                        )
                                                    }
                                                    className="h-8 w-16 text-sm"
                                                />
                                                <span className="w-3 text-xs text-fg-muted">%</span>
                                                <span className="ml-auto w-20 shrink-0 text-right text-xs whitespace-nowrap text-fg-muted tabular-nums sm:ml-0">
                                                    {formatMoney(allocated)}
                                                </span>
                                            </div>
                                            <Meter
                                                value={value / 100}
                                                tone={JAR_COLOR[jar.key] ?? 'accent'}
                                            />
                                        </div>
                                    );
                                })}
                            </section>
                        );
                    })}

                    {/* Decision help stays at the decision, small: the top tip, the rest on request. */}
                    <HelperGate>
                        {coachTips.length > 0 ? (
                            <div className="grid gap-1.5 border-t border-line py-2">
                                {(showAllTips ? coachTips : coachTips.slice(0, 1)).map(tip => (
                                    <div
                                        key={tip.id}
                                        className={cn(
                                            'flex items-start justify-between gap-2 rounded-md border px-2.5 py-1.5',
                                            tip.severity === 'warn'
                                                ? 'border-warning bg-warning/5'
                                                : 'border-line bg-raised/40'
                                        )}>
                                        <p className="min-w-0 text-xs leading-snug text-fg">
                                            {t(`features.coach.split_tips.${tip.id}`)}
                                        </p>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="shrink-0"
                                            onClick={() =>
                                                setDismissedTips(prev => ({
                                                    ...prev,
                                                    [tip.id]: true,
                                                }))
                                            }>
                                            {t('features.coach.got_it')}
                                        </Button>
                                    </div>
                                ))}
                                {!showAllTips && coachTips.length > 1 ? (
                                    <button
                                        type="button"
                                        aria-expanded={false}
                                        onClick={() => setShowAllTips(true)}
                                        className="min-h-11 justify-self-start rounded-md px-1 text-left text-xs font-semibold text-accent underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                                        {t('features.coach.split_more', {
                                            count: coachTips.length - 1,
                                        })}
                                    </button>
                                ) : null}
                            </div>
                        ) : null}
                    </HelperGate>

                    <div className="flex justify-end gap-2 border-t border-line py-2">
                        <Button variant="ghost" size="sm" onClick={resetDefaults}>
                            {t('ui.button.actions.reset')}
                        </Button>
                        <Button
                            size="sm"
                            disabled={!live || !balanced || saveSplit.isPending}
                            onClick={() => saveSplit.mutate()}>
                            {saveSplit.isPending
                                ? t('pages.settings.working')
                                : t('pages.settings.save')}
                        </Button>
                    </div>
                    {!live ? (
                        <div className="pb-2">
                            <StubNotice
                                prefix={t('ui.statusPage.scaffold')}
                                what={t('pages.settings.panels.income_split.sign_in_stub')}
                            />
                        </div>
                    ) : null}
                </div>
            </SettingsInkCard>
        </SettingsPanel>
    );
}
