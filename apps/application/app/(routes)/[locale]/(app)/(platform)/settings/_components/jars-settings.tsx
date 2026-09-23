'use client';

import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { DEFAULT_JAR_SPLIT, SpendingStyle, type JarKey } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations } from '@rumtelo/i18n';
import { Badge, Button, Input, Meter, StubNotice, VendorMark } from '@rumtelo/ui';
import { cn, formatIban, formatPercent, sumMonthly } from '@rumtelo/utils';

import { useApiError } from '@/app/_lib/api-error-messages';
import { evaluateSplitCoach, pctByJarKey } from '@/app/_lib/split-coach';
import { isLiveData } from '@/app/_lib/preview';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import { BankAccountRow } from '@/components/features/money/bank-account-row';
import { SettingsInkCard, SettingsPanel, SettingsPill, SettingsRow } from './settings-chrome';
import { accountBankMark, countryFromCurrency } from '../_utils/resolve-account-bank';
import { JAR_COLOR, accountKindLabel } from '../_utils/settings-shared';

export function JarsSettings() {
    const t = useTranslations();
    const queryClient = useQueryClient();
    const { householdId } = useAuth();
    const { showToast } = useAppShell();
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

    const jars = useMemo(() => jarsQuery.data ?? [], [jarsQuery.data]);
    const accounts = useMemo(() => accountsQuery.data ?? [], [accountsQuery.data]);
    const serverPct = useMemo(
        () => Object.fromEntries(jars.map(j => [j.id, j.percentage])),
        [jars]
    );
    const [pctDraft, setPctDraft] = useState<Record<string, number> | null>(null);
    const [dismissedTips, setDismissedTips] = useState<Record<string, true>>({});
    /** Jar → account seat until the mapping API lands. */
    const [jarSeats, setJarSeats] = useState<Record<string, string>>({});
    const [editingJarId, setEditingJarId] = useState<string | null>(null);
    const pct = pctDraft ?? serverPct;

    const total = Object.values(pct).reduce((running, value) => running + value, 0);
    const balanced = Math.abs(total - 100) < 0.01;

    const effectiveJarSeats = useMemo(() => {
        if (accounts.length === 0) return jarSeats;
        const fallbackId = accounts[0]!.id;
        const next: Record<string, string> = { ...jarSeats };
        for (const jar of jars) {
            const current = next[jar.id];
            if (current && accounts.some(account => account.id === current)) continue;
            next[jar.id] = fallbackId;
        }
        return next;
    }, [accounts, jars, jarSeats]);

    const coachTips = useMemo(() => {
        const spendingStyle = accountSettingsQuery.data?.spendingStyle ?? SpendingStyle.UNKNOWN;
        const tips = evaluateSplitCoach(pctByJarKey(jars, pct), spendingStyle);
        return tips.filter(tip => !dismissedTips[tip.id]);
    }, [jars, pct, dismissedTips, accountSettingsQuery.data?.spendingStyle]);

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
            setPctDraft(null);
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.jars.list.key() });
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.jars.balances.key() });
            showToast(t('pages.settings.toasts.split_saved'), 'success');
        },
        onError: (error: unknown) => showToast(apiError(error), 'error'),
    });

    function resetDefaults() {
        const next: Record<string, number> = {};
        for (const jar of jars) {
            next[jar.id] = DEFAULT_JAR_SPLIT[jar.key as JarKey] ?? jar.percentage;
        }
        setPctDraft(next);
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
                                        <span className="text-sm text-fg">{jar.name}</span>
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
                                                setJarSeats(prev => ({
                                                    ...prev,
                                                    [jar.id]: option.id,
                                                }));
                                                setEditingJarId(null);
                                                showToast(
                                                    t(
                                                        'pages.settings.panels.jars_placement.seat_saved',
                                                        {
                                                            jar: jar.name,
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
                    {jars.map((jar, i) => {
                        const value = pct[jar.id] ?? jar.percentage;
                        const allocated = Math.round((monthlyNet * value) / 100);
                        return (
                            <div
                                key={jar.id}
                                className={cn(
                                    'grid gap-1.5 py-2',
                                    i < jars.length - 1 && 'border-b border-line'
                                )}>
                                <div className="flex items-center gap-2">
                                    <span
                                        className={cn(
                                            'size-1.5 shrink-0 rounded-sm',
                                            JAR_COLOR[jar.key] ?? 'bg-accent'
                                        )}
                                    />
                                    <label
                                        htmlFor={`pct-${jar.id}`}
                                        className="min-w-0 flex-1 truncate text-sm text-fg">
                                        {jar.name}
                                    </label>
                                    <Input
                                        id={`pct-${jar.id}`}
                                        type="number"
                                        min={0}
                                        max={100}
                                        step={0.5}
                                        value={value}
                                        onChange={event =>
                                            setPctDraft(prev => ({
                                                ...(prev ?? serverPct),
                                                [jar.id]: Number(event.target.value) || 0,
                                            }))
                                        }
                                        className="h-8 w-16 text-sm"
                                    />
                                    <span className="w-3 text-xs text-fg-muted">%</span>
                                    <span className="w-20 shrink-0 text-right text-xs text-fg-muted tabular-nums">
                                        {formatMoney(allocated)}
                                    </span>
                                </div>
                                <Meter value={value / 100} tone={JAR_COLOR[jar.key] ?? 'accent'} />
                            </div>
                        );
                    })}

                    {coachTips.length > 0 ? (
                        <div className="grid gap-1.5 border-t border-line py-2">
                            <p className="font-mono text-[9px] tracking-[0.14em] text-accent uppercase">
                                {t('features.coach.helpers.mark_label')}
                            </p>
                            {coachTips.map(tip => (
                                <div
                                    key={tip.id}
                                    className={cn(
                                        'flex items-start justify-between gap-2 rounded-md border px-2.5 py-1.5',
                                        tip.severity === 'warn'
                                            ? 'border-amber-500/40 bg-amber-500/5'
                                            : 'border-line bg-raised/40'
                                    )}>
                                    <p className="text-xs leading-snug text-fg">
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
                        </div>
                    ) : null}

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
