'use client';

import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import {
    JAR_GROUP_ORDER,
    JAR_MAIN_KEY_BY_GROUP,
    JAR_ORDER_IN_GROUP,
    JarGroup,
    OPTIONAL_JAR_SHARE,
    isMainJarKey,
    jarGroupFor,
    sumPercentageByGroup,
    type Jar,
    type OptionalJarKey,
} from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import { Badge, Button, Input, Meter, StubNotice, VendorMark } from '@rumtelo/ui';
import { cn, formatIban, formatPercent, sumMonthly } from '@rumtelo/utils';

import { useApiError } from '@/app/_lib/api-error-messages';
import { planBasicsFit } from '@/app/_lib/basics-fit';
import {
    GROUP_CHROME,
    defaultSharesById,
    formatShare,
    groupSlug,
    jarsInGroup,
    orderJarsByGroup,
    splitGroupAnchor,
} from '@/app/_lib/jar-group';
import { sameShares } from '@/app/_lib/jar-group-split';
import { isLiveData } from '@/app/_lib/preview';
import { evaluateSplitCoach, orderSplitTips, pctByJarKey } from '@/app/_lib/split-coach';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import { useJarName, useJarPurpose } from '@/app/_lib/use-jar-name';
import { HelperGate } from '@/components/features/helpers';
import { BankAccountRow } from '@/components/features/money/bank-account-row';
import { usePotRefineControls } from '@/components/features/money/use-pot-refine-controls';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';
import { accountBankMark, countryFromCurrency } from '../_utils/resolve-account-bank';
import { JAR_COLOR, accountKindLabel } from '../_utils/settings-shared';
import { JarsBasicsFit } from './jars-basics-fit';
import { SettingsInkCard, SettingsPanel, SettingsPill, SettingsRow } from './settings-chrome';

type JarsSettingsValues = {
    pct: Record<string, number>;
    jarSeats: Record<string, string>;
};

export function JarsSettings() {
    const t = useTranslations();
    const tGroups = useTranslations('features.money.groups');
    const tJars = useTranslations('features.money.jars');
    const jarName = useJarName();
    const jarPurpose = useJarPurpose();
    const locale = useLocale();
    const queryClient = useQueryClient();
    const { householdId } = useAuth();
    const { showToast } = useHouseholdShell();
    const apiError = useApiError();
    const { formatMoney } = useHouseholdCurrency();
    const live = isLiveData(householdId);
    const { canRefine, pendingKey, onTurnOn, onTurnOff, dialog } = usePotRefineControls();

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

    // Pots turned on or off change the server's shares (the main pot gives or takes back). When
    // the person had no unsaved edits, follow the server; otherwise keep their edits. The buttons
    // are blocked while edits exist, so this only matters for a refetch from elsewhere.
    const savedSharesRef = useRef<Record<string, number> | null>(null);
    useEffect(() => {
        const previous = savedSharesRef.current;
        savedSharesRef.current = serverPct;
        if (!previous || jars.length === 0) return;
        if (sameShares(previous, form.getValues('pct'))) form.setValue('pct', serverPct);
    }, [form, jars.length, serverPct]);

    // Links from the pots board (`#split-basis`) land on a block that only exists after the pot
    // list has loaded, so the browser's own hash scroll misses it: scroll once the blocks exist.
    const scrolledToHash = useRef(false);
    useEffect(() => {
        if (scrolledToHash.current || jars.length === 0) return;
        scrolledToHash.current = true;
        const id = window.location.hash.slice(1);
        if (id) document.getElementById(id)?.scrollIntoView({ block: 'start' });
    }, [jars.length]);

    const [dismissedTips, setDismissedTips] = useState<Record<string, true>>({});
    const [showAllTips, setShowAllTips] = useState(false);
    const [editingJarId, setEditingJarId] = useState<string | null>(null);

    // Every pot counted once, from the pots the household has now (a turned-off pot's id may
    // still sit in the form state until the refetch lands).
    const shareOf = (jar: Jar) => pct[jar.id] ?? jar.percentage;
    const total = jars.reduce((running, jar) => running + shareOf(jar), 0);
    // The server accepts a split only when it adds up to exactly 10 000 basis points, so compare
    // the same rounded integers here — Save is enabled only when the server will take it.
    const totalBasisPoints = jars.reduce(
        (running, jar) => running + Math.round(shareOf(jar) * 100),
        0
    );
    // Unsaved percentage edits (seat changes save themselves and are not edits).
    const hasUnsavedShares = jars.some(
        jar => Math.round(shareOf(jar) * 100) !== Math.round(jar.percentage * 100)
    );
    const balanced = totalBasisPoints === 10_000;
    // Live group subtotals follow the inputs, in basis points so they add up without drift.
    const groupShares = sumPercentageByGroup(
        jars.map(jar => ({ key: jar.key, percentage: shareOf(jar) }))
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
        const tips = orderSplitTips(evaluateSplitCoach(pctByJarKey(jars, pct)));
        return tips.filter(tip => !dismissedTips[tip.id]);
    })();

    const incomeQuery = useLiveQuery(
        apiQuery.money.income.list.queryOptions({ input: { householdId: householdId! } }),
        [],
        live
    );
    const monthlyNet = useMemo(() => sumMonthly(incomeQuery.data ?? []), [incomeQuery.data]);

    // Basics fit: the real fixed costs on Basics pots (`committedOut`, monthly) against the period
    // income. The balances already carry both — the pots' `allocated` always add up to the income —
    // so nothing is recomputed from stored data here.
    const balancesQuery = useLiveQuery(
        apiQuery.money.jars.balances.queryOptions({ input: { householdId: householdId! } }),
        null,
        live
    );
    const currentShares = useMemo(
        () => Object.fromEntries(jars.map(jar => [jar.id, pct[jar.id] ?? jar.percentage])),
        [jars, pct]
    );
    const basicsFit = useMemo(() => {
        const balances = balancesQuery.data;
        if (!balances || jars.length === 0) return null;
        const incomeMinor = balances.reduce((running, jar) => running + jar.allocated, 0);
        const basicsCostsMinor = balances
            .filter(jar => jarGroupFor(jar.key) === JarGroup.BASIS)
            .reduce((running, jar) => running + jar.committedOut, 0);
        return {
            basicsCostsMinor,
            fit: planBasicsFit({
                jars,
                shares: currentShares,
                incomeMinor,
                basicsCostsMinor,
            }),
        };
    }, [balancesQuery.data, jars, currentShares]);

    const saveSplit = useMutation({
        mutationFn: async () => {
            if (!householdId) throw new Error('No household');
            return api.money.jars.updateSplit({
                householdId,
                // Every pot the household has, once: the server rejects a missing or extra pot.
                split: jars.map(jar => ({ jarId: jar.id, percentage: shareOf(jar) })),
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
        // The default for the pots this household has: always adds up to 100.
        const next = defaultSharesById(jars);
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
                                        <span className="text-sm text-fg">{jarName(jar)}</span>
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
                                                            jar: jarName(jar),
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
                    {/* Only for roles that can save the split: the button fills it in, Save stays the household's move. */}
                    {canRefine && basicsFit ? (
                        <JarsBasicsFit
                            fit={basicsFit.fit}
                            costs={formatMoney(basicsFit.basicsCostsMinor)}
                            shares={currentShares}
                            onApply={shares => {
                                form.setValue('pct', { ...pct, ...shares }, { shouldDirty: true });
                                setDismissedTips({});
                            }}
                        />
                    ) : null}
                    {visibleGroups.map((group, groupIndex) => {
                        const groupJars = jarsInGroup(jars, group);
                        const headingId = `split-group-${groupSlug(group)}`;
                        return (
                            <section
                                key={group}
                                id={splitGroupAnchor(group)}
                                aria-labelledby={headingId}
                                className={cn(
                                    'scroll-mt-24',
                                    groupIndex > 0 && 'mt-2 border-t border-line pt-2'
                                )}>
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
                                {/* One list per group: every pot it can have. A pot that is on
                                    shows its share and amount; an optional pot has its on/off
                                    button on the same row; the main pot is always on. */}
                                {JAR_ORDER_IN_GROUP[group].map((key, i, keys) => {
                                    const jar = groupJars.find(row => row.key === key) ?? null;
                                    const isMain = isMainJarKey(key);
                                    const optionalKey = isMain ? null : (key as OptionalJarKey);
                                    const name = jar ? jarName(jar) : tJars(`names.${key}`);
                                    const groupTitle = tGroups(`${group}.title`);
                                    const mainJar = groupJars.find(
                                        row => row.key === JAR_MAIN_KEY_BY_GROUP[group]
                                    );
                                    const mainName = mainJar ? jarName(mainJar) : groupTitle;
                                    const nameId = `pct-name-${key}`;
                                    const buttonId = `pct-action-${key}`;
                                    const working = pendingKey === key;
                                    const value = jar ? (pct[jar.id] ?? jar.percentage) : 0;
                                    const allocated = Math.round((monthlyNet * value) / 100);
                                    const badge = isMain
                                        ? tGroups('refine.always_on')
                                        : jar
                                          ? tGroups('refine.turned_on')
                                          : tGroups('refine.optional_label');
                                    const toggle =
                                        optionalKey && canRefine ? (
                                            <Button
                                                id={buttonId}
                                                type="button"
                                                variant={jar ? 'secondary' : 'primary'}
                                                size="sm"
                                                // The button's own text plus the pot name: "Turn off Daily".
                                                aria-labelledby={`${buttonId} ${nameId}`}
                                                disabled={hasUnsavedShares || pendingKey !== null}
                                                aria-busy={working}
                                                className="min-h-11 shrink-0"
                                                onClick={() =>
                                                    jar ? onTurnOff(jar) : onTurnOn(optionalKey)
                                                }>
                                                {working
                                                    ? t('pages.settings.working')
                                                    : jar
                                                      ? tGroups('refine.turn_off')
                                                      : tGroups('refine.turn_on')}
                                            </Button>
                                        ) : null;
                                    const nameAndBadge = (
                                        <>
                                            <label
                                                id={nameId}
                                                htmlFor={jar ? `pct-${jar.id}` : undefined}
                                                className="min-w-0 text-sm break-words text-fg">
                                                {name}
                                            </label>
                                            <span className="rounded-full border border-line bg-raised px-2 py-0.5 font-mono text-[11px] leading-snug whitespace-nowrap text-fg-muted">
                                                {badge}
                                            </span>
                                        </>
                                    );
                                    const rowClass = cn(
                                        'grid gap-1.5 py-2',
                                        i < keys.length - 1 && 'border-b border-line'
                                    );
                                    if (!jar) {
                                        // An optional pot that is off: what it is for, what turning it on does.
                                        return (
                                            <div key={key} className={rowClass}>
                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                                                    <span className="grid min-w-0 basis-full gap-0.5 sm:flex-1 sm:basis-0">
                                                        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                                                            {nameAndBadge}
                                                        </span>
                                                        <span className="text-xs leading-snug text-fg-muted">
                                                            {jarPurpose(key)}
                                                        </span>
                                                        {optionalKey ? (
                                                            <span className="text-xs leading-snug text-fg-secondary">
                                                                {tGroups('refine.turn_on_effect', {
                                                                    share: formatShare(
                                                                        OPTIONAL_JAR_SHARE[
                                                                            optionalKey
                                                                        ],
                                                                        locale
                                                                    ),
                                                                    main: mainName,
                                                                    pot: name,
                                                                    group: groupTitle,
                                                                    percent: formatShare(
                                                                        groupShares[group],
                                                                        locale
                                                                    ),
                                                                })}
                                                            </span>
                                                        ) : null}
                                                    </span>
                                                    {toggle}
                                                </div>
                                            </div>
                                        );
                                    }
                                    return (
                                        <div key={key} className={rowClass}>
                                            {/* Below sm the label gets its own line and wraps, so a long Dutch pot name is never clipped; the controls sit under it. */}
                                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                                                <span className="flex min-w-0 basis-full flex-wrap items-center gap-x-2 gap-y-1 sm:flex-1 sm:basis-0">
                                                    <span
                                                        className={cn(
                                                            'size-1.5 shrink-0 rounded-sm',
                                                            JAR_COLOR[jar.key] ?? 'bg-accent'
                                                        )}
                                                    />
                                                    {nameAndBadge}
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
                                                {toggle}
                                            </div>
                                            <Meter
                                                value={value / 100}
                                                tone={JAR_COLOR[jar.key] ?? 'accent'}
                                            />
                                        </div>
                                    );
                                })}
                                {canRefine && hasUnsavedShares ? (
                                    <p className="pb-1 text-xs leading-snug text-warning">
                                        {tGroups('refine.save_first')}
                                    </p>
                                ) : null}
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

            {dialog}
        </SettingsPanel>
    );
}
