'use client';

import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';
import { changePassword, signOut } from '@/app/_lib/auth';
import { CAPABILITIES, lockCopyFor, memberLimitLabel, PlanKey } from '@/app/_lib/plan';
import { isLiveData } from '@/app/_lib/preview';
import { useAccountTheme } from '@/components/features/shell/account-theme-sync';
import { useFeatureHelpers } from '@/components/features/helpers';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';
import { usePageTour } from '@/components/features/tour';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    type Currency,
    HouseholdRole,
    IncomeStability,
    type Locale,
    LOCALES,
    SpendingStyle,
    Theme,
    canAddHouseholdMember,
    canInviteOnPlan,
} from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import {
    Icon,
    Badge,
    Button,
    DangerZone,
    Field,
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
    Input,
    Email,
    Phone,
    Password,
    StubNotice,
    Toggle,
} from '@rumtelo/ui';
import { cn, DEFAULT_CURRENCY, formatMoney as formatMoneyExplicit } from '@rumtelo/utils';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import {
    SettingsInkCard,
    SettingsPanel,
    SettingsPill,
    SettingsRow,
    SettingsRowLabel,
} from './settings-chrome';
import {
    createInviteFormSchema,
    createPasswordFormSchema,
    createPeriodFormSchema,
    createProfileFormSchema,
    type InviteFormValues,
    type PasswordFormValues,
    type PeriodFormValues,
    type ProfileFormValues,
} from '../_utils/settings-form-zod';
import { CURRENCY_OPTIONS, initials } from '../_utils/settings-shared';
import { useSettingsMutation } from '../_utils/use-settings-mutation';

export function AccountSettings() {
    const t = useTranslations();
    const appLocale = useLocale();
    const router = useRouter();
    const { session, householdId, refreshSession } = useAuth();
    const { showToast, locale, setLocale, plan } = useAppShell();
    const { restartFullTour } = usePageTour();
    const { helpersEnabled, setHelpersEnabled } = useFeatureHelpers();
    const live = isLiveData(householdId);
    const user = session?.user;
    const profileQuery = useLiveQuery(apiQuery.account.profile.queryOptions(), null, Boolean(user));
    const [editingName, setEditingName] = useState(false);
    const [signingOut, setSigningOut] = useState(false);
    const [currencyDraft, setCurrencyDraft] = useState<string | null>(null);

    const profileForm = useForm<ProfileFormValues>({
        defaultValues: {
            displayName: '',
            firstName: '',
            middleName: '',
            lastName: '',
            phone: '',
            dateOfBirth: '',
        },
        resolver: zodResolver(createProfileFormSchema(t)),
    });
    const passwordForm = useForm<PasswordFormValues>({
        defaultValues: { currentPassword: '', newPassword: '' },
        resolver: zodResolver(createPasswordFormSchema(t)),
    });
    const inviteForm = useForm<InviteFormValues>({
        defaultValues: { email: '' },
        resolver: zodResolver(createInviteFormSchema(t)),
    });
    const periodForm = useForm<PeriodFormValues>({
        defaultValues: { periodStartDay: 1 },
        resolver: zodResolver(createPeriodFormSchema(t)),
    });

    const membersQuery = useLiveQuery(
        apiQuery.household.members.queryOptions({ input: { householdId: householdId! } }),
        [],
        live
    );
    const settingsQuery = useLiveQuery(
        apiQuery.household.settings.queryOptions({ input: { householdId: householdId! } }),
        null,
        live
    );
    const accountSettingsQuery = useLiveQuery(apiQuery.account.settings.queryOptions(), null, live);
    const householdQuery = useLiveQuery(
        apiQuery.household.current.queryOptions({ input: { householdId: householdId! } }),
        null,
        live
    );
    const audiencesQuery = useLiveQuery(
        apiQuery.money.catalogs.audiences.list.queryOptions({
            input: { householdId: householdId! },
        }),
        [],
        live
    );
    const audienceChips = useMemo(
        () => (audiencesQuery.data ?? []).filter(audience => !audience.isBaseline),
        [audiencesQuery.data]
    );

    const activePlan = settingsQuery.data?.planKey ?? plan;
    const memberCount = membersQuery.data?.length ?? 0;
    const invitesAllowed = canInviteOnPlan(activePlan);
    const seatOpen = canAddHouseholdMember(activePlan, memberCount);
    const inviteCopy = lockCopyFor(CAPABILITIES.platformInvite, PlanKey.PLUS, t);

    const currency =
        settingsQuery.data?.currency ?? householdQuery.data?.currency ?? DEFAULT_CURRENCY;
    const activeCurrency = currencyDraft ?? currency;

    const { accountTheme, setAccountTheme } = useAccountTheme();
    const activeTheme = accountTheme ?? Theme.LIGHT;
    const serverPeriodDay = settingsQuery.data?.money?.periodStartDay ?? 1;

    const saveProfile = useSettingsMutation({
        mutationFn: async (values: ProfileFormValues) => {
            await api.account.updateProfile({
                displayName: values.displayName.trim(),
                firstName: values.firstName.trim() || null,
                middleName: values.middleName.trim() || null,
                lastName: values.lastName.trim() || null,
                phone: values.phone.trim() || null,
                dateOfBirth: values.dateOfBirth.trim() || null,
            });
        },
        invalidateKeys: [apiQuery.account.profile.key()],
        successMessage: t('pages.settings.saved'),
        onSuccess: async () => {
            await refreshSession();
            setEditingName(false);
            profileForm.reset();
        },
    });

    const savePassword = useSettingsMutation({
        mutationFn: async (values: PasswordFormValues) => {
            const result = await changePassword({
                currentPassword: values.currentPassword,
                newPassword: values.newPassword,
                revokeOtherSessions: true,
            });
            if (result.error) {
                throw new Error(result.error.message ?? t('pages.settings.toasts.password_failed'));
            }
        },
        successMessage: t('pages.settings.toasts.password_changed'),
        onSuccess: () => passwordForm.reset({ currentPassword: '', newPassword: '' }),
    });

    const invite = useSettingsMutation({
        mutationFn: async (values: InviteFormValues) => {
            if (!householdId) throw new Error('No household');
            return api.household.invite({
                householdId,
                email: values.email.trim(),
                role: HouseholdRole.MEMBER,
            });
        },
        invalidateKeys: [apiQuery.household.members.key()],
        successMessage: t('pages.settings.toasts.invitation_sent'),
        onSuccess: () => inviteForm.reset({ email: '' }),
    });

    const saveLocale = useSettingsMutation({
        mutationFn: async (next: Locale) => api.account.updateSettings({ locale: next }),
        invalidateKeys: [apiQuery.account.settings.key()],
        successMessage: t('pages.settings.toasts.language_saved'),
        onSuccess: (_data, next) => {
            if (locale !== next) setLocale(next);
        },
    });

    const saveCurrency = useSettingsMutation({
        mutationFn: async (next: Currency) => {
            if (!householdId) throw new Error('No household');
            return api.household.updateSettings({ householdId, currency: next });
        },
        invalidateKeys: [apiQuery.household.settings.key(), apiQuery.household.current.key()],
        successMessage: t('pages.settings.toasts.currency_saved'),
        onSuccess: () => setCurrencyDraft(null),
    });

    const savePeriod = useSettingsMutation({
        mutationFn: async (values: PeriodFormValues) => {
            if (!householdId) throw new Error('No household');
            return api.household.updateSettings({
                householdId,
                money: { periodStartDay: values.periodStartDay },
            });
        },
        invalidateKeys: [apiQuery.household.settings.key()],
        successMessage: t('pages.settings.toasts.period_saved'),
        onSuccess: (_data, values) => {
            periodForm.reset({ periodStartDay: values.periodStartDay });
        },
    });

    const saveTheme = useSettingsMutation({
        mutationFn: async (next: Theme) => setAccountTheme(next),
        onError: () => showToast(t('pages.settings.toasts.theme_failed'), 'error'),
    });

    const saveSpendingStyle = useSettingsMutation({
        mutationFn: async (next: SpendingStyle) =>
            api.account.updateSettings({ spendingStyle: next }),
        invalidateKeys: [apiQuery.account.settings.key()],
        successMessage: t('pages.settings.toasts.money_style_saved'),
    });

    const saveIncomeStability = useSettingsMutation({
        mutationFn: async (next: IncomeStability) => {
            if (!householdId) throw new Error('No household');
            return api.household.updateSettings({ householdId, money: { incomeStability: next } });
        },
        invalidateKeys: [apiQuery.household.settings.key()],
        successMessage: t('pages.settings.toasts.income_stability_saved'),
    });

    const saveAudienceKeys = useSettingsMutation({
        mutationFn: async (next: string[]) => {
            if (!householdId) throw new Error('No household');
            return api.household.updateSettings({ householdId, audienceKeys: next });
        },
        invalidateKeys: [apiQuery.household.settings.key()],
        successMessage: t('pages.settings.toasts.household_profile_saved'),
    });

    function toggleAudienceKey(key: string) {
        if (!live) return;
        const current = settingsQuery.data?.audienceKeys ?? [];
        const next = current.includes(key)
            ? current.filter(existing => existing !== key)
            : [...current, key];
        saveAudienceKeys.mutate(next);
    }

    function pickLocale(next: Locale) {
        if (live) saveLocale.mutate(next);
        else if (locale !== next) setLocale(next);
    }

    function pickCurrency(code: string, persist: boolean) {
        if (!persist) {
            showToast(t('pages.settings.toasts.chf_coming'), 'info');
            return;
        }
        setCurrencyDraft(code);
        if (live) saveCurrency.mutate(code as Currency);
    }

    async function handleSignOut() {
        setSigningOut(true);
        try {
            await signOut();
            router.push('/sign-in');
        } catch {
            showToast(t('pages.settings.toasts.sign_out_failed'), 'error');
            setSigningOut(false);
        }
    }

    const displayName =
        profileQuery.data?.displayName?.trim() || user?.name?.trim() || t('pages.settings.guest');
    const displayEmail = profileQuery.data?.email ?? user?.email ?? '';
    const activeLang = accountSettingsQuery.data?.locale ?? locale;

    function beginEditProfile() {
        profileForm.reset({
            displayName: profileQuery.data?.displayName ?? user?.name ?? '',
            firstName: profileQuery.data?.firstName ?? '',
            middleName: profileQuery.data?.middleName ?? '',
            lastName: profileQuery.data?.lastName ?? '',
            phone: profileQuery.data?.phone ?? '',
            dateOfBirth: profileQuery.data?.dateOfBirth ?? '',
        });
        setEditingName(true);
    }

    function cancelEditProfile() {
        setEditingName(false);
        profileForm.reset();
    }

    useEffect(() => {
        if (!periodForm.formState.isDirty) {
            periodForm.reset({ periodStartDay: serverPeriodDay });
        }
        // Sync server → form when prefs load; skip while the user is editing.
        // eslint-disable-next-line react-hooks/exhaustive-deps -- reset/isDirty from RHF
    }, [serverPeriodDay]);

    return (
        <SettingsPanel>
            <Form {...profileForm}>
                <SettingsInkCard
                    eyebrow={t('pages.settings.panels.profile.eyebrow')}
                    blurb={t('pages.settings.panels.profile.blurb')}>
                    <SettingsRow>
                        <div className="flex min-w-0 items-center gap-3.5">
                            <div className="grid size-8 shrink-0 place-items-center rounded-full bg-accent font-mono text-[10px] font-bold text-on-accent">
                                {initials(displayName, displayEmail)}
                            </div>
                            {editingName ? (
                                <div className="grid min-w-0 flex-1 gap-1.5">
                                    <FormField
                                        control={profileForm.control}
                                        name="displayName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        aria-label={t(
                                                            'pages.settings.account.display_name'
                                                        )}
                                                        placeholder={t(
                                                            'pages.settings.account.display_name'
                                                        )}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <p
                                        className="truncate font-mono text-[10px] text-fg-muted"
                                        aria-label={t('pages.settings.account.email')}>
                                        {displayEmail}
                                    </p>
                                </div>
                            ) : (
                                <span className="grid min-w-0 gap-px">
                                    <span className="truncate text-sm text-fg">{displayName}</span>
                                    <span
                                        className="truncate font-mono text-[10px] text-fg-muted"
                                        aria-label={t('pages.settings.account.email')}>
                                        {displayEmail || '—'}
                                    </span>
                                </span>
                            )}
                        </div>
                        {editingName ? (
                            <div className="flex gap-2">
                                <Button variant="ghost" size="sm" onClick={cancelEditProfile}>
                                    {t('pages.settings.cancel')}
                                </Button>
                                <Button
                                    size="sm"
                                    disabled={
                                        saveProfile.isPending ||
                                        !profileForm.watch('displayName').trim()
                                    }
                                    onClick={profileForm.handleSubmit(values =>
                                        saveProfile.mutate(values)
                                    )}>
                                    {saveProfile.isPending ? '…' : t('pages.settings.account.save')}
                                </Button>
                            </div>
                        ) : (
                            <Button
                                variant="secondary"
                                size="sm"
                                className="rounded-full font-mono text-[10px] tracking-[0.12em] uppercase"
                                onClick={beginEditProfile}>
                                <Icon name="pencil" size="sm" />
                                {t('pages.settings.edit')}
                            </Button>
                        )}
                    </SettingsRow>

                    {editingName ? (
                        <div className="grid gap-2 border-t border-line pt-3 sm:grid-cols-2">
                            <FormField
                                control={profileForm.control}
                                name="firstName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                aria-label={t(
                                                    'pages.settings.panels.profile.first_name'
                                                )}
                                                placeholder={t(
                                                    'pages.settings.panels.profile.first_name'
                                                )}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={profileForm.control}
                                name="middleName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                aria-label={t(
                                                    'pages.settings.panels.profile.middle_name'
                                                )}
                                                placeholder={t(
                                                    'pages.settings.panels.profile.middle_name_optional'
                                                )}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={profileForm.control}
                                name="lastName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                aria-label={t(
                                                    'pages.settings.panels.profile.last_name'
                                                )}
                                                placeholder={t(
                                                    'pages.settings.panels.profile.last_name'
                                                )}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={profileForm.control}
                                name="phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <Phone
                                                value={field.value}
                                                onChange={field.onChange}
                                                aria-label={t(
                                                    'pages.settings.panels.profile.phone'
                                                )}
                                                placeholder={t(
                                                    'pages.settings.panels.profile.phone_optional'
                                                )}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={profileForm.control}
                                name="dateOfBirth"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <Input
                                                type="date"
                                                {...field}
                                                aria-label={t(
                                                    'pages.settings.panels.profile.date_of_birth'
                                                )}
                                                pickerAriaLabel={t('ui.form.aria.open_date_picker')}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>
                    ) : profileQuery.data ? (
                        <SettingsRow>
                            <SettingsRowLabel
                                title={
                                    [profileQuery.data.firstName, profileQuery.data.lastName]
                                        .filter(Boolean)
                                        .join(' ') || t('pages.settings.legal_name')
                                }
                                sub={
                                    [
                                        profileQuery.data.phone,
                                        profileQuery.data.dateOfBirth
                                            ? t('pages.settings.born', {
                                                  date: profileQuery.data.dateOfBirth,
                                              })
                                            : null,
                                    ]
                                        .filter(Boolean)
                                        .join(' · ') ||
                                    t('pages.settings.panels.profile.add_details')
                                }
                            />
                        </SettingsRow>
                    ) : null}

                    <SettingsRow>
                        <SettingsRowLabel
                            title={t('pages.settings.rows.sign_in_method.title')}
                            sub={t('pages.settings.rows.sign_in_method.sub')}
                        />
                        <SettingsPill tone="accent">
                            {t('pages.settings.rows.sign_in_method.connected')}
                        </SettingsPill>
                    </SettingsRow>

                    <SettingsRow>
                        <SettingsRowLabel
                            title={t('pages.settings.rows.two_factor.title')}
                            sub={t('pages.settings.rows.two_factor.sub')}
                        />
                        <SettingsPill tone="neutral">
                            {t('pages.settings.rows.two_factor.off')}
                        </SettingsPill>
                    </SettingsRow>

                    <SettingsRow>
                        <SettingsRowLabel
                            title={t('pages.settings.account.language')}
                            sub={t('pages.settings.account.language_sub')}
                        />
                        <div className="flex gap-1 rounded-full border border-line bg-raised p-0.5">
                            {LOCALES.map(code => {
                                const on = activeLang === code;
                                return (
                                    <button
                                        key={code}
                                        type="button"
                                        onClick={() => pickLocale(code)}
                                        className={cn(
                                            'rounded-full px-3.5 py-1.5 font-mono text-[10px] font-medium tracking-[0.12em] uppercase transition-colors',
                                            on
                                                ? 'bg-accent text-on-accent'
                                                : 'text-fg-muted hover:text-fg'
                                        )}>
                                        {code}
                                    </button>
                                );
                            })}
                        </div>
                    </SettingsRow>

                    <SettingsRow>
                        <SettingsRowLabel
                            title={t('pages.settings.account.currency')}
                            sub={t('pages.settings.account.currency_sub')}
                        />
                        <div className="flex flex-wrap justify-end gap-1.5">
                            {CURRENCY_OPTIONS.map(opt => {
                                const on = activeCurrency === opt.code;
                                return (
                                    <button
                                        key={opt.code}
                                        type="button"
                                        onClick={() => pickCurrency(opt.code, opt.persist)}
                                        className={cn(
                                            'grid gap-0.5 rounded-[10px] border px-3 py-2 text-left transition-colors',
                                            on
                                                ? 'border-accent bg-accent-soft'
                                                : 'border-line hover:border-accent/50'
                                        )}>
                                        <span
                                            className={cn(
                                                'font-mono text-[10px] font-medium tracking-wide',
                                                on ? 'text-accent' : 'text-fg'
                                            )}>
                                            {opt.code}
                                        </span>
                                        <span className="font-mono text-[10.5px] text-fg-muted">
                                            {formatMoneyExplicit(430_000, {
                                                currency: opt.code === 'CHF' ? 'CHF' : opt.code,
                                                locale: appLocale,
                                            })}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </SettingsRow>

                    <SettingsRow last>
                        <SettingsRowLabel
                            title={t('pages.settings.account.sign_out')}
                            sub={t('pages.settings.panels.sign_out_sub')}
                        />
                        <Button
                            variant="secondary"
                            size="sm"
                            className="rounded-full border-danger/40 font-mono text-[10px] tracking-[0.12em] text-danger uppercase hover:border-danger"
                            disabled={signingOut}
                            onClick={() => void handleSignOut()}>
                            {signingOut ? '…' : t('pages.settings.account.sign_out')}
                        </Button>
                    </SettingsRow>
                </SettingsInkCard>
            </Form>

            <SettingsInkCard
                eyebrow={t('pages.settings.panels.money_style.eyebrow')}
                blurb={t('pages.settings.panels.money_style.blurb')}>
                <SettingsRow>
                    <SettingsRowLabel
                        title={t('pages.settings.rows.spending_style.title')}
                        sub={t('pages.settings.rows.spending_style.sub')}
                    />
                    <div className="flex flex-wrap justify-end gap-1.5">
                        {(
                            [
                                {
                                    key: SpendingStyle.SPENDER,
                                    label: t('pages.settings.panels.money_style.spender'),
                                    sub: t('pages.settings.panels.money_style.spender_sub'),
                                },
                                {
                                    key: SpendingStyle.SAVER,
                                    label: t('pages.settings.panels.money_style.saver'),
                                    sub: t('pages.settings.panels.money_style.saver_sub'),
                                },
                                {
                                    key: SpendingStyle.BALANCED,
                                    label: t('pages.settings.panels.money_style.balanced'),
                                    sub: t('pages.settings.panels.money_style.balanced_sub'),
                                },
                                {
                                    key: SpendingStyle.UNKNOWN,
                                    label: t('pages.settings.panels.money_style.not_sure'),
                                    sub: t('pages.settings.panels.money_style.not_sure_sub'),
                                },
                            ] as const
                        ).map(option => {
                            const on =
                                (accountSettingsQuery.data?.spendingStyle ??
                                    SpendingStyle.UNKNOWN) === option.key;
                            return (
                                <button
                                    key={option.key}
                                    type="button"
                                    onClick={() => {
                                        if (live) saveSpendingStyle.mutate(option.key);
                                    }}
                                    className={cn(
                                        'grid min-w-[4.5rem] gap-0.5 rounded-[10px] border px-3 py-2 text-left transition-colors',
                                        on
                                            ? 'border-accent bg-accent-soft'
                                            : 'border-line hover:border-accent/50'
                                    )}>
                                    <span
                                        className={cn(
                                            'text-xs font-medium',
                                            on ? 'text-accent' : 'text-fg'
                                        )}>
                                        {option.label}
                                    </span>
                                    <span className="font-mono text-[9px] text-fg-muted">
                                        {option.sub}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </SettingsRow>
                <SettingsRow last>
                    <SettingsRowLabel
                        title={t('pages.settings.rows.income_stability.title')}
                        sub={t('pages.settings.rows.income_stability.sub')}
                    />
                    <div className="flex flex-wrap gap-1 rounded-full border border-line bg-raised p-0.5">
                        {(
                            [
                                {
                                    key: IncomeStability.STABLE,
                                    label: t('pages.settings.panels.money_style.stable'),
                                },
                                {
                                    key: IncomeStability.VARIABLE,
                                    label: t('pages.settings.panels.money_style.variable'),
                                },
                                {
                                    key: IncomeStability.NONE,
                                    label: t('pages.settings.panels.money_style.none'),
                                },
                            ] as const
                        ).map(option => {
                            const on =
                                (settingsQuery.data?.money?.incomeStability ??
                                    IncomeStability.STABLE) === option.key;
                            return (
                                <button
                                    key={option.key}
                                    type="button"
                                    disabled={!live || !householdId}
                                    onClick={() => saveIncomeStability.mutate(option.key)}
                                    className={cn(
                                        'rounded-full px-3.5 py-1.5 font-mono text-[10px] font-medium tracking-[0.12em] uppercase transition-colors',
                                        on
                                            ? 'bg-accent text-on-accent'
                                            : 'text-fg-muted hover:text-fg'
                                    )}>
                                    {option.label}
                                </button>
                            );
                        })}
                    </div>
                </SettingsRow>
            </SettingsInkCard>

            <SettingsInkCard
                eyebrow={t('pages.settings.panels.password.eyebrow')}
                blurb={t('pages.settings.panels.password.blurb')}>
                <Form {...passwordForm}>
                    <form
                        className="grid gap-3 py-2.5"
                        onSubmit={passwordForm.handleSubmit(values => savePassword.mutate(values))}>
                        <FormField
                            control={passwordForm.control}
                            name="currentPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <Field
                                        label={t('pages.settings.panels.password.current')}
                                        htmlFor="cur-pw">
                                        <FormControl>
                                            <Password
                                                id="cur-pw"
                                                {...field}
                                                placeholder={t('ui.form.fields.password_mask')}
                                                showPasswordLabel={t('ui.form.show_password')}
                                                hidePasswordLabel={t('ui.form.hide_password')}
                                                autoComplete="current-password"
                                            />
                                        </FormControl>
                                    </Field>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={passwordForm.control}
                            name="newPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <Field
                                        label={t('pages.settings.panels.password.next')}
                                        htmlFor="new-pw"
                                        hint={t('pages.settings.panels.password.hint')}>
                                        <FormControl>
                                            <Password
                                                id="new-pw"
                                                {...field}
                                                placeholder={t('ui.form.fields.password_mask')}
                                                showPasswordLabel={t('ui.form.show_password')}
                                                hidePasswordLabel={t('ui.form.hide_password')}
                                                autoComplete="new-password"
                                            />
                                        </FormControl>
                                    </Field>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="flex justify-end">
                            <Button
                                type="submit"
                                variant="secondary"
                                disabled={savePassword.isPending}>
                                {savePassword.isPending
                                    ? t('pages.settings.working')
                                    : t('pages.settings.panels.password.change')}
                            </Button>
                        </div>
                    </form>
                </Form>
            </SettingsInkCard>

            <SettingsInkCard
                eyebrow={t('pages.settings.panels.household.eyebrow')}
                blurb={`${memberLimitLabel(activePlan, t)}. ${t('pages.settings.panels.household.blurb_suffix')}`}>
                <div className="grid gap-3 py-2.5">
                    {live && (membersQuery.data?.length ?? 0) > 0 ? (
                        <ul className="divide-y divide-line rounded-lg border border-line">
                            {(membersQuery.data ?? []).map(member => (
                                <li
                                    key={member.id}
                                    className="flex items-center justify-between gap-3 px-3 py-2.5">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-fg">
                                            {member.displayName}
                                        </p>
                                        <p className="truncate text-xs text-fg-muted">
                                            {member.email}
                                        </p>
                                    </div>
                                    <Badge>{member.role}</Badge>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <StubNotice
                            prefix={t('ui.statusPage.scaffold')}
                            what={t('pages.settings.panels.household.members_stub')}
                        />
                    )}
                    {!invitesAllowed ? (
                        <p className="text-sm text-fg-muted">
                            {inviteCopy.line}{' '}
                            <span className="font-medium text-fg">{inviteCopy.cta}</span>
                        </p>
                    ) : !seatOpen ? (
                        <p className="text-sm text-fg-muted">
                            {t('pages.settings.panels.household.seat_limit', {
                                limit: memberLimitLabel(activePlan, t),
                            })}
                        </p>
                    ) : (
                        <Form {...inviteForm}>
                            <form
                                className="grid gap-3"
                                onSubmit={inviteForm.handleSubmit(values => invite.mutate(values))}>
                                <FormField
                                    control={inviteForm.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <Field
                                                label={t(
                                                    'pages.settings.panels.household.invite_email'
                                                )}
                                                htmlFor="invite-email">
                                                <FormControl>
                                                    <Email
                                                        id="invite-email"
                                                        {...field}
                                                        placeholder={t(
                                                            'pages.settings.panels.household.invite_placeholder'
                                                        )}
                                                        disabled={!live}
                                                    />
                                                </FormControl>
                                            </Field>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="flex justify-end">
                                    <Button
                                        type="submit"
                                        variant="secondary"
                                        disabled={!live || invite.isPending}>
                                        {invite.isPending
                                            ? t('pages.settings.working')
                                            : t('pages.settings.invite')}
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    )}
                </div>
            </SettingsInkCard>

            <SettingsInkCard
                eyebrow={t('pages.settings.panels.household_profile.eyebrow')}
                blurb={t('pages.settings.panels.household_profile.blurb')}>
                <div
                    className="flex flex-wrap gap-1.5 py-2.5"
                    role="group"
                    aria-label={t('pages.settings.panels.household_profile.eyebrow')}>
                    {audienceChips.map(audience => {
                        const on = (settingsQuery.data?.audienceKeys ?? []).includes(audience.key);
                        return (
                            <button
                                key={audience.key}
                                type="button"
                                title={audience.description ?? undefined}
                                aria-pressed={on}
                                disabled={!live || saveAudienceKeys.isPending}
                                onClick={() => toggleAudienceKey(audience.key)}
                                className={cn(
                                    'inline-flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-60',
                                    !on &&
                                        'border-line bg-raised text-fg-secondary hover:border-accent-hover hover:text-accent'
                                )}
                                style={
                                    on
                                        ? {
                                              borderColor: audience.accentColor ?? undefined,
                                              backgroundColor: audience.softColor ?? undefined,
                                              color: audience.accentColor ?? undefined,
                                          }
                                        : undefined
                                }>
                                {audience.icon ? <span aria-hidden>{audience.icon}</span> : null}
                                {audience.name}
                            </button>
                        );
                    })}
                </div>
                {(settingsQuery.data?.audienceKeys ?? []).length === 0 ? (
                    <p className="pb-1 text-xs text-fg-muted">
                        {t('pages.settings.panels.household_profile.none_selected')}
                    </p>
                ) : null}
            </SettingsInkCard>

            <SettingsInkCard
                eyebrow={t('pages.settings.panels.display.eyebrow')}
                blurb={t('pages.settings.panels.display.blurb')}>
                <SettingsRow>
                    <SettingsRowLabel
                        title={t('pages.settings.rows.appearance.title')}
                        sub={t('pages.settings.rows.appearance.sub')}
                    />
                    <div className="flex gap-1 rounded-full border border-line bg-raised p-0.5">
                        {(
                            [
                                {
                                    value: Theme.SYSTEM,
                                    label: t('pages.settings.panels.display.system'),
                                },
                                {
                                    value: Theme.LIGHT,
                                    label: t('pages.settings.panels.display.light'),
                                },
                                {
                                    value: Theme.DARK,
                                    label: t('pages.settings.panels.display.dark'),
                                },
                            ] as const
                        ).map(option => {
                            const on = activeTheme === option.value;
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    disabled={!live || saveTheme.isPending}
                                    onClick={() => saveTheme.mutate(option.value)}
                                    className={cn(
                                        'rounded-full px-3.5 py-1.5 font-mono text-[10px] font-medium tracking-[0.12em] uppercase transition-colors',
                                        on
                                            ? 'bg-accent text-on-accent'
                                            : 'text-fg-muted hover:text-fg'
                                    )}>
                                    {option.label}
                                </button>
                            );
                        })}
                    </div>
                </SettingsRow>
                <SettingsRow last>
                    <Form {...periodForm}>
                        <form
                            className="grid w-full gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
                            onSubmit={periodForm.handleSubmit(values => savePeriod.mutate(values))}>
                            <FormField
                                control={periodForm.control}
                                name="periodStartDay"
                                render={({ field }) => (
                                    <FormItem>
                                        <Field
                                            label={t('pages.settings.panels.display.period_day')}
                                            htmlFor="period-day"
                                            hint={t(
                                                'pages.settings.panels.display.period_day_hint'
                                            )}>
                                            <FormControl>
                                                <Input
                                                    id="period-day"
                                                    type="number"
                                                    min={1}
                                                    max={28}
                                                    className="w-28"
                                                    disabled={!live}
                                                    {...field}
                                                    value={field.value}
                                                    onChange={event =>
                                                        field.onChange(
                                                            Math.min(
                                                                28,
                                                                Math.max(
                                                                    1,
                                                                    Number(event.target.value) || 1
                                                                )
                                                            )
                                                        )
                                                    }
                                                />
                                            </FormControl>
                                        </Field>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button
                                type="submit"
                                variant="secondary"
                                disabled={!live || savePeriod.isPending}>
                                {savePeriod.isPending
                                    ? t('pages.settings.working')
                                    : t('pages.settings.save')}
                            </Button>
                        </form>
                    </Form>
                </SettingsRow>
            </SettingsInkCard>

            <SettingsInkCard
                eyebrow={t('pages.settings.panels.coach.eyebrow')}
                blurb={t('pages.settings.panels.coach.blurb')}>
                <Toggle
                    checked={helpersEnabled}
                    label={t('pages.settings.panels.coach.toggle')}
                    hint={
                        helpersEnabled
                            ? t('pages.settings.panels.coach.hint_on')
                            : t('pages.settings.panels.coach.hint_off')
                    }
                    onCheckedChange={setHelpersEnabled}
                />
            </SettingsInkCard>

            <SettingsInkCard
                eyebrow={t('features.tour.chrome.settings.eyebrow')}
                blurb={t('features.tour.chrome.settings.blurb')}>
                <SettingsRow last>
                    <SettingsRowLabel
                        title={t('features.tour.chrome.settings.row_title')}
                        sub={t('features.tour.chrome.settings.row_sub')}
                    />
                    <Button type="button" variant="secondary" onClick={restartFullTour}>
                        {t('features.tour.chrome.settings.restart')}
                    </Button>
                </SettingsRow>
            </SettingsInkCard>

            <DangerZone
                title={t('pages.settings.account.delete_account')}
                body={t('pages.settings.delete.body')}
                action={t('pages.settings.account.delete_account')}
                onAction={() => showToast(t('pages.settings.toasts.delete_coming'), 'info')}
            />
        </SettingsPanel>
    );
}
