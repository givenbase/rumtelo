'use client';

import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import {
    AccountKind,
    Currency,
    DEFAULT_JAR_SPLIT,
    HouseholdRole,
    IncomeStability,
    type Locale,
    LOCALES,
    SpendingStyle,
    PayoffStrategy,
    Theme,
    bankingCategoryTemplate,
    canAddHouseholdMember,
    canInviteOnPlan,
    type JarKey,
} from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import {
    Badge,
    Button,
    DangerZone,
    Field,
    Input,
    Email,
    Phone,
    Password,
    Meter,
    Select,
    StubNotice,
    Toggle,
    Typography,
    VendorMark,
} from '@rumtelo/ui';
import {
    clearPlanIntent,
    cn,
    DEFAULT_CURRENCY,
    formatMoney as formatMoneyExplicit,
    formatPercent,
    formatPlanPrice,
    extractErrorMessage,
    formatIban,
    isValidIban,
    nlIbanBankCode,
    normalizeIban,
    sumMonthly,
    toPeriodKey,
} from '@rumtelo/utils';

import { useApiError } from '@/app/_lib/api-error-messages';
import { isIbanApiErrorMessage } from '@/app/_lib/api-user-message';
import { changePassword, signOut, updateOrganization } from '@/app/_lib/auth';
import { env } from '@/app/_utils/get-env';
import { useAccountTheme } from '@/components/features/shell/account-theme-sync';
import { downloadTextFile, toCsv } from '@/app/_lib/download';
import { vendorMarkSrc } from '@/app/_lib/vendor-brands';
import { merchantsToNameOptions } from '@/components/features/forms/merchant-name-options';
import { useCategoryTemplates } from '@/components/features/forms/catalog-helpers';
import {
    PresetNameField,
    type NamePresetOption,
} from '@/components/features/forms/preset-name-field';
import {
    CAPABILITIES,
    diffPlans,
    lockCopyFor,
    memberLimitLabel,
    planLabel,
    PLAN_RANK,
    PlanKey,
} from '@/app/_lib/plan';
import { isLiveData, PREVIEW_MODE } from '@/app/_lib/preview';
import { isDemoAccountEmail } from '@rumtelo/contracts/platform';
import { evaluateSplitCoach, pctByJarKey } from '@/app/_lib/split-coach';
import { JAR_CHROME } from '@/app/_lib/jar-meta';
import { usePageTour } from '@/components/features/tour';
import { useFeatureHelpers } from '@/components/features/helpers';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';
import { EditIcon } from '@/components/features/ui/action-icons';

import {
    SettingsInkCard,
    SettingsPanel,
    SettingsPill,
    SettingsRow,
    SettingsRowLabel,
} from './settings-chrome';
import { PlanChangeDialog } from './plan-change-dialog';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';

const JAR_COLOR: Record<string, string> = Object.fromEntries(
    Object.entries(JAR_CHROME).map(([key, chrome]) => [key, chrome.color])
);

function accountKindLabel(kind: string, t: (key: string) => string): string {
    const key = {
        CHECKING: 'pages.settings.panels.bank.checking',
        SAVINGS: 'pages.settings.panels.bank.savings',
        CREDIT: 'pages.settings.panels.bank.credit',
        CASH: 'pages.settings.panels.bank.cash',
        INVESTMENT: 'pages.settings.panels.bank.investment',
    }[kind];
    return key ? t(key) : kind;
}

/** True when the field is empty or still only a bank stub / previous stub. */
function isIbanStub(value: string): boolean {
    const compact = value.replace(/\s+/g, '').toUpperCase();
    if (!compact) return true;
    return /^NL\d{0,2}[A-Z]{0,4}\d{0,10}$/.test(compact) && compact.length <= 8;
}

function formatNlIbanStub(bankCode: string): string {
    return `NL00 ${bankCode} 0000 0000 00`;
}

function nlIbanPrefix(bankCode: string): string {
    return `NL00 ${bankCode} `;
}

const CURRENCY_OPTIONS = [
    { code: Currency.EUR, persist: true as const },
    { code: Currency.USD, persist: true as const },
    { code: Currency.GBP, persist: true as const },
    { code: 'CHF', persist: false as const },
];

const AUTO_RULE_KEYS = ['split', 'guard', 'sweep'] as const;
const AUTO_RULE_DEFAULTS: Record<(typeof AUTO_RULE_KEYS)[number], boolean> = {
    split: true,
    guard: true,
    sweep: true,
};

function initials(name: string, email: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
        return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
    }
    if (parts[0]?.length) return parts[0].slice(0, 2).toUpperCase();
    return (email.slice(0, 2) || '?').toUpperCase();
}

export function AccountSettings() {
    const t = useTranslations();
    const appLocale = useLocale();
    const queryClient = useQueryClient();
    const router = useRouter();
    const { session, householdId, refreshSession } = useAuth();
    const { showToast, locale, setLocale, plan } = useAppShell();
    const { restartFullTour } = usePageTour();
    const { helpersEnabled, setHelpersEnabled } = useFeatureHelpers();
    const live = isLiveData(householdId);
    const apiError = useApiError();

    const user = session?.user;
    const profileQuery = useLiveQuery(apiQuery.account.profile.queryOptions(), null, Boolean(user));
    const [editingName, setEditingName] = useState(false);
    const [nameDraft, setNameDraft] = useState(user?.name ?? '');
    const [firstNameDraft, setFirstNameDraft] = useState('');
    const [middleNameDraft, setMiddleNameDraft] = useState('');
    const [lastNameDraft, setLastNameDraft] = useState('');
    const [phoneDraft, setPhoneDraft] = useState('');
    const [dobDraft, setDobDraft] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [inviteEmail, setInviteEmail] = useState('');
    const [signingOut, setSigningOut] = useState(false);

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

    const activePlan = settingsQuery.data?.planKey ?? plan;
    const memberCount = membersQuery.data?.length ?? 0;
    const invitesAllowed = canInviteOnPlan(activePlan);
    const seatOpen = canAddHouseholdMember(activePlan, memberCount);
    const inviteCopy = lockCopyFor(CAPABILITIES.platformInvite, PlanKey.PLUS, t);

    const currency =
        settingsQuery.data?.currency ?? householdQuery.data?.currency ?? DEFAULT_CURRENCY;
    const [currencyDraft, setCurrencyDraft] = useState<string | null>(null);
    const activeCurrency = currencyDraft ?? currency;

    const { accountTheme, setAccountTheme } = useAccountTheme();
    const activeTheme = accountTheme ?? Theme.LIGHT;
    const [periodDayDraft, setPeriodDayDraft] = useState<number | null>(null);
    const periodDay = periodDayDraft ?? settingsQuery.data?.money?.periodStartDay ?? 1;

    const saveProfile = useMutation({
        mutationFn: async () => {
            await api.account.updateProfile({
                displayName: nameDraft.trim(),
                firstName: firstNameDraft.trim() || null,
                middleName: middleNameDraft.trim() || null,
                lastName: lastNameDraft.trim() || null,
                phone: phoneDraft.trim() || null,
                dateOfBirth: dobDraft.trim() || null,
            });
        },
        onSuccess: async () => {
            await Promise.all([
                refreshSession(),
                queryClient.invalidateQueries({ queryKey: apiQuery.account.profile.key() }),
            ]);
            setEditingName(false);
            showToast(t('pages.settings.saved'), 'success');
        },
        onError: (error: unknown) => showToast(apiError(error), 'error'),
    });

    const savePassword = useMutation({
        mutationFn: async () => {
            const result = await changePassword({
                currentPassword,
                newPassword,
                revokeOtherSessions: true,
            });
            if (result.error) {
                throw new Error(result.error.message ?? t('pages.settings.toasts.password_failed'));
            }
        },
        onSuccess: () => {
            setCurrentPassword('');
            setNewPassword('');
            showToast(t('pages.settings.toasts.password_changed'), 'success');
        },
        onError: (error: unknown) => showToast(apiError(error), 'error'),
    });

    const invite = useMutation({
        mutationFn: async () => {
            if (!householdId) throw new Error('No household');
            return api.household.invite({
                householdId,
                email: inviteEmail.trim(),
                role: HouseholdRole.MEMBER,
            });
        },
        onSuccess: () => {
            setInviteEmail('');
            void queryClient.invalidateQueries({ queryKey: apiQuery.household.members.key() });
            showToast(t('pages.settings.toasts.invitation_sent'), 'success');
        },
        onError: (error: unknown) => showToast(apiError(error), 'error'),
    });

    const saveLocale = useMutation({
        mutationFn: async (next: Locale) => {
            return api.account.updateSettings({ locale: next });
        },
        onSuccess: (_data, next) => {
            if (locale !== next) setLocale(next);
            void queryClient.invalidateQueries({ queryKey: apiQuery.account.settings.key() });
            showToast(t('pages.settings.toasts.language_saved'), 'success');
        },
        onError: (error: unknown) => showToast(apiError(error), 'error'),
    });

    const saveCurrency = useMutation({
        mutationFn: async (next: Currency) => {
            if (!householdId) throw new Error('No household');
            return api.household.updateSettings({ householdId, currency: next });
        },
        onSuccess: () => {
            setCurrencyDraft(null);
            void queryClient.invalidateQueries({ queryKey: apiQuery.household.settings.key() });
            void queryClient.invalidateQueries({ queryKey: apiQuery.household.current.key() });
            showToast(t('pages.settings.toasts.currency_saved'), 'success');
        },
        onError: (error: unknown) => showToast(apiError(error), 'error'),
    });

    const savePeriod = useMutation({
        mutationFn: async () => {
            if (!householdId) throw new Error('No household');
            return api.household.updateSettings({
                householdId,
                money: { periodStartDay: periodDay },
            });
        },
        onSuccess: () => {
            setPeriodDayDraft(null);
            void queryClient.invalidateQueries({ queryKey: apiQuery.household.settings.key() });
            showToast(t('pages.settings.toasts.period_saved'), 'success');
        },
        onError: (error: unknown) => showToast(apiError(error), 'error'),
    });

    const saveTheme = useMutation({
        mutationFn: async (next: Theme) => setAccountTheme(next),
        onError: () => showToast(t('pages.settings.toasts.theme_failed'), 'error'),
    });

    const saveSpendingStyle = useMutation({
        mutationFn: async (next: SpendingStyle) => {
            return api.account.updateSettings({ spendingStyle: next });
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: apiQuery.account.settings.key() });
            showToast(t('pages.settings.toasts.money_style_saved'), 'success');
        },
        onError: (error: unknown) => showToast(apiError(error), 'error'),
    });

    const saveIncomeStability = useMutation({
        mutationFn: async (next: IncomeStability) => {
            if (!householdId) throw new Error('No household');
            return api.household.updateSettings({ householdId, money: { incomeStability: next } });
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: apiQuery.household.settings.key() });
            showToast(t('pages.settings.toasts.income_stability_saved'), 'success');
        },
        onError: (error: unknown) => showToast(apiError(error), 'error'),
    });

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
        setNameDraft(profileQuery.data?.displayName ?? user?.name ?? '');
        setFirstNameDraft(profileQuery.data?.firstName ?? '');
        setMiddleNameDraft(profileQuery.data?.middleName ?? '');
        setLastNameDraft(profileQuery.data?.lastName ?? '');
        setPhoneDraft(profileQuery.data?.phone ?? '');
        setDobDraft(profileQuery.data?.dateOfBirth ?? '');
        setEditingName(true);
    }

    return (
        <SettingsPanel>
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
                                <Input
                                    value={nameDraft}
                                    onChange={event => setNameDraft(event.target.value)}
                                    aria-label={t('pages.settings.account.display_name')}
                                    placeholder={t('pages.settings.account.display_name')}
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
                            <Button variant="ghost" size="sm" onClick={() => setEditingName(false)}>
                                {t('pages.settings.cancel')}
                            </Button>
                            <Button
                                size="sm"
                                disabled={saveProfile.isPending || !nameDraft.trim()}
                                onClick={() => saveProfile.mutate()}>
                                {saveProfile.isPending ? '…' : t('pages.settings.account.save')}
                            </Button>
                        </div>
                    ) : (
                        <Button
                            variant="secondary"
                            size="sm"
                            className="rounded-full font-mono text-[10px] tracking-[0.12em] uppercase"
                            onClick={beginEditProfile}>
                            <EditIcon />
                            {t('pages.settings.edit')}
                        </Button>
                    )}
                </SettingsRow>

                {editingName ? (
                    <div className="grid gap-2 border-t border-line pt-3 sm:grid-cols-2">
                        <Input
                            value={firstNameDraft}
                            onChange={event => setFirstNameDraft(event.target.value)}
                            aria-label={t('pages.settings.panels.profile.first_name')}
                            placeholder={t('pages.settings.panels.profile.first_name')}
                        />
                        <Input
                            value={middleNameDraft}
                            onChange={event => setMiddleNameDraft(event.target.value)}
                            aria-label={t('pages.settings.panels.profile.middle_name')}
                            placeholder={t('pages.settings.panels.profile.middle_name_optional')}
                        />
                        <Input
                            value={lastNameDraft}
                            onChange={event => setLastNameDraft(event.target.value)}
                            aria-label={t('pages.settings.panels.profile.last_name')}
                            placeholder={t('pages.settings.panels.profile.last_name')}
                        />
                        <Phone
                            value={phoneDraft}
                            onChange={setPhoneDraft}
                            aria-label={t('pages.settings.panels.profile.phone')}
                            placeholder={t('pages.settings.panels.profile.phone_optional')}
                        />
                        <Input
                            type="date"
                            value={dobDraft}
                            onChange={event => setDobDraft(event.target.value)}
                            aria-label={t('pages.settings.panels.profile.date_of_birth')}
                            pickerAriaLabel={t('ui.form.aria.open_date_picker')}
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
                                    .join(' · ') || t('pages.settings.panels.profile.add_details')
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
                <div className="grid gap-3 py-2.5">
                    <Field label={t('pages.settings.panels.password.current')} htmlFor="cur-pw">
                        <Password
                            id="cur-pw"
                            value={currentPassword}
                            onChange={event => setCurrentPassword(event.target.value)}
                            placeholder={t('ui.form.fields.password_mask')}
                            showPasswordLabel={t('ui.form.show_password')}
                            hidePasswordLabel={t('ui.form.hide_password')}
                            autoComplete="current-password"
                        />
                    </Field>
                    <Field
                        label={t('pages.settings.panels.password.next')}
                        htmlFor="new-pw"
                        hint={t('pages.settings.panels.password.hint')}>
                        <Password
                            id="new-pw"
                            value={newPassword}
                            onChange={event => setNewPassword(event.target.value)}
                            placeholder={t('ui.form.fields.password_mask')}
                            showPasswordLabel={t('ui.form.show_password')}
                            hidePasswordLabel={t('ui.form.hide_password')}
                            autoComplete="new-password"
                        />
                    </Field>
                    <div className="flex justify-end">
                        <Button
                            variant="secondary"
                            disabled={
                                savePassword.isPending ||
                                currentPassword.length < 1 ||
                                newPassword.length < 8
                            }
                            onClick={() => savePassword.mutate()}>
                            {savePassword.isPending
                                ? t('pages.settings.working')
                                : t('pages.settings.panels.password.change')}
                        </Button>
                    </div>
                </div>
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
                        <>
                            <Field
                                label={t('pages.settings.panels.household.invite_email')}
                                htmlFor="invite-email">
                                <Email
                                    id="invite-email"
                                    value={inviteEmail}
                                    onChange={event => setInviteEmail(event.target.value)}
                                    placeholder={t(
                                        'pages.settings.panels.household.invite_placeholder'
                                    )}
                                    disabled={!live}
                                />
                            </Field>
                            <div className="flex justify-end">
                                <Button
                                    variant="secondary"
                                    disabled={
                                        !live || invite.isPending || !inviteEmail.includes('@')
                                    }
                                    onClick={() => invite.mutate()}>
                                    {invite.isPending
                                        ? t('pages.settings.working')
                                        : t('pages.settings.invite')}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
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
                    <div className="grid w-full gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                        <Field
                            label={t('pages.settings.panels.display.period_day')}
                            htmlFor="period-day"
                            hint={t('pages.settings.panels.display.period_day_hint')}>
                            <Input
                                id="period-day"
                                type="number"
                                min={1}
                                max={28}
                                value={periodDay}
                                onChange={event =>
                                    setPeriodDayDraft(
                                        Math.min(28, Math.max(1, Number(event.target.value) || 1))
                                    )
                                }
                                className="w-28"
                                disabled={!live}
                            />
                        </Field>
                        <Button
                            variant="secondary"
                            disabled={!live || savePeriod.isPending}
                            onClick={() => savePeriod.mutate()}>
                            {savePeriod.isPending
                                ? t('pages.settings.working')
                                : t('pages.settings.save')}
                        </Button>
                    </div>
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

    function accountLabel(accountId: string | undefined) {
        if (!accountId) return null;
        const account = accounts.find(item => item.id === accountId);
        if (!account) return null;
        return `${account.name}${account.iban ? ` · ${account.iban.slice(-4)}` : ''}`;
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
                    const label = accountLabel(seatId);
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
                                        <span
                                            className={cn(
                                                'font-mono text-[10px]',
                                                label ? 'text-fg-secondary' : 'text-warning'
                                            )}>
                                            {label ??
                                                t('pages.settings.panels.jars_placement.not_set')}
                                        </span>
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
                                <div className="flex flex-wrap gap-2 pb-3 pl-5">
                                    {accounts.map(account => {
                                        const selected = seatId === account.id;
                                        return (
                                            <button
                                                key={account.id}
                                                type="button"
                                                onClick={() => {
                                                    setJarSeats(prev => ({
                                                        ...prev,
                                                        [jar.id]: account.id,
                                                    }));
                                                    setEditingJarId(null);
                                                    showToast(
                                                        t(
                                                            'pages.settings.panels.jars_placement.seat_saved',
                                                            {
                                                                jar: jar.name,
                                                                account: account.name,
                                                            }
                                                        ),
                                                        'success'
                                                    );
                                                }}
                                                className={cn(
                                                    'rounded-full border px-3 py-1.5 text-left text-xs transition-colors',
                                                    selected
                                                        ? 'border-accent bg-accent/10 text-fg'
                                                        : 'border-line text-fg-secondary hover:border-fg-faint hover:text-fg'
                                                )}>
                                                <span className="block font-medium text-fg">
                                                    {account.name}
                                                </span>
                                                <span className="font-mono text-[10px] text-fg-muted">
                                                    {accountKindLabel(account.kind, t) ??
                                                        account.kind}
                                                    {account.iban
                                                        ? ` · ${account.iban.slice(-4)}`
                                                        : ''}
                                                </span>
                                            </button>
                                        );
                                    })}
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

export function DebtSettings() {
    const t = useTranslations();
    const queryClient = useQueryClient();
    const { householdId } = useAuth();
    const { showToast } = useAppShell();
    const apiError = useApiError();
    const live = isLiveData(householdId);

    const settingsQuery = useLiveQuery(
        apiQuery.household.settings.queryOptions({ input: { householdId: householdId! } }),
        null,
        live
    );

    const strategy = settingsQuery.data?.money?.payoffStrategy ?? PayoffStrategy.AVALANCHE;

    const saveStrategy = useMutation({
        mutationFn: async (next: PayoffStrategy) => {
            if (!householdId) throw new Error('No household');
            return api.household.updateSettings({
                householdId,
                money: { payoffStrategy: next },
            });
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: apiQuery.household.settings.key() });
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.debts.plan.key() });
            showToast(t('pages.settings.toasts.payoff_saved'), 'success');
        },
        onError: (error: unknown) => showToast(apiError(error), 'error'),
    });

    return (
        <SettingsPanel>
            <SettingsInkCard
                eyebrow={t('pages.settings.panels.debt_payoff.eyebrow')}
                blurb={t('pages.settings.panels.debt_payoff.blurb')}
                badge={
                    <SettingsPill tone="accent">
                        {strategy === PayoffStrategy.AVALANCHE
                            ? t('pages.settings.panels.debt_payoff.avalanche')
                            : strategy === PayoffStrategy.SNOWBALL
                              ? t('pages.settings.panels.debt_payoff.snowball')
                              : t('pages.settings.panels.debt_payoff.minimal')}
                    </SettingsPill>
                }>
                {(
                    [
                        {
                            key: PayoffStrategy.AVALANCHE,
                            name: t('pages.settings.panels.debt_payoff.avalanche'),
                            tag: t('pages.settings.panels.debt_payoff.avalanche_tag'),
                            desc: t('pages.settings.panels.debt_payoff.avalanche_desc'),
                            metric: t('pages.settings.panels.debt_payoff.avalanche_metric'),
                        },
                        {
                            key: PayoffStrategy.SNOWBALL,
                            name: t('pages.settings.panels.debt_payoff.snowball'),
                            tag: t('pages.settings.panels.debt_payoff.snowball_tag'),
                            desc: t('pages.settings.panels.debt_payoff.snowball_desc'),
                            metric: t('pages.settings.panels.debt_payoff.snowball_metric'),
                        },
                        {
                            key: PayoffStrategy.MINIMAL,
                            name: t('pages.settings.panels.debt_payoff.minimal'),
                            tag: t('pages.settings.panels.debt_payoff.minimal_tag'),
                            desc: t('pages.settings.panels.debt_payoff.minimal_desc'),
                            metric: t('pages.settings.panels.debt_payoff.minimal_metric'),
                        },
                    ] as const
                ).map((option, index, list) => {
                    const on = strategy === option.key;
                    return (
                        <button
                            key={option.key}
                            type="button"
                            aria-label={option.name}
                            disabled={!live || saveStrategy.isPending}
                            onClick={() => {
                                if (live) saveStrategy.mutate(option.key);
                            }}
                            className={cn(
                                'flex w-full items-start gap-2.5 py-2.5 text-left',
                                index < list.length - 1 && 'border-b border-line'
                            )}>
                            <span
                                className={cn(
                                    'mt-0.5 grid size-3.5 shrink-0 place-items-center rounded-full border',
                                    on ? 'border-accent' : 'border-line'
                                )}>
                                <span
                                    className={cn(
                                        'size-1.5 rounded-full',
                                        on ? 'bg-accent' : 'bg-transparent'
                                    )}
                                />
                            </span>
                            <span className="grid min-w-0 flex-1 gap-0.5">
                                <span className="flex flex-wrap items-baseline gap-2">
                                    <span className="text-sm text-fg">{option.name}</span>
                                    <span className="font-mono text-[9px] tracking-[0.12em] text-accent uppercase">
                                        {option.tag}
                                    </span>
                                </span>
                                <span className="text-[11px] leading-snug text-pretty text-fg-muted">
                                    {option.desc}
                                </span>
                                <span className="font-mono text-[10px] text-fg-secondary">
                                    {option.metric}
                                </span>
                            </span>
                        </button>
                    );
                })}
            </SettingsInkCard>
        </SettingsPanel>
    );
}

export function BankSettings() {
    const t = useTranslations();
    const apiError = useApiError();
    const queryClient = useQueryClient();
    const { householdId } = useAuth();
    const { showToast } = useAppShell();
    const { formatMoney } = useHouseholdCurrency();
    const live = isLiveData(householdId);

    const accountsQuery = useLiveQuery(
        apiQuery.money.accounts.list.queryOptions({ input: { householdId: householdId! } }),
        [],
        live
    );
    const categoriesQuery = useCategoryTemplates(live);
    const bankingCategoryKey = useMemo(
        () => bankingCategoryTemplate(categoriesQuery.data ?? [])?.key ?? null,
        [categoriesQuery.data]
    );
    const bankingMerchantsQuery = useLiveQuery(
        apiQuery.money.catalogs.merchantPresets.list.queryOptions({
            input: {
                householdId: householdId!,
                categoryTemplateKey: bankingCategoryKey,
            },
        }),
        [],
        live && Boolean(bankingCategoryKey)
    );
    /** Retail banks only (exclude BNPL / rails also under Banking). */
    const bankList = useMemo(() => {
        const rails = new Set(['KLARNA', 'AFTERPAY', 'PAYPAL', 'WISE']);
        return (bankingMerchantsQuery.data ?? []).filter(merchant => !rails.has(merchant.key));
    }, [bankingMerchantsQuery.data]);

    const bankNameOptions = useMemo((): NamePresetOption[] => {
        return [
            ...merchantsToNameOptions(bankList, {
                categoryTemplateKey: bankingCategoryKey ?? undefined,
            }),
            {
                key: 'OTHER',
                name: t('pages.settings.panels.bank.preset_other'),
                group: t('pages.settings.panels.bank.preset_custom'),
            },
        ];
    }, [bankList, bankingCategoryKey, t]);

    const bankByKey = useMemo(() => new Map(bankList.map(bank => [bank.key, bank])), [bankList]);

    /** Match a saved account name back to a catalog bank for logos. */
    function resolveBankForAccount(accountName: string) {
        const needle = accountName.trim().toLowerCase();
        return (
            bankList.find(bank => {
                const bankName = bank.name.toLowerCase();
                return (
                    needle === bankName ||
                    needle.startsWith(`${bankName} ·`) ||
                    needle.startsWith(`${bankName} -`) ||
                    needle.includes(bankName)
                );
            }) ?? null
        );
    }

    const [bankKey, setBankKey] = useState<string | null>(null);
    const [label, setLabel] = useState('');
    const [iban, setIban] = useState('');
    const [ibanError, setIbanError] = useState<string | null>(null);
    const [kind, setKind] = useState<AccountKind>(AccountKind.CHECKING);
    const [adding, setAdding] = useState(false);
    const [customBank, setCustomBank] = useState(false);

    function resetAddForm() {
        setBankKey(null);
        setLabel('');
        setIban('');
        setIbanError(null);
        setKind(AccountKind.CHECKING);
        setCustomBank(false);
        setAdding(false);
    }

    function pickBank(key: string) {
        const bank = bankByKey.get(key);
        if (!bank) return;
        setCustomBank(false);
        setBankKey(key);
        setLabel(prev =>
            prev.trim() && prev.trim() !== bankByKey.get(bankKey ?? '')?.name ? prev : bank.name
        );
        const code = bank.ibanBankCode?.toUpperCase() ?? null;
        if (code) {
            setIban(prev => (isIbanStub(prev) ? nlIbanPrefix(code) : prev));
            setIbanError(null);
        }
    }

    function resolveIbanForSubmit(): string | null {
        const trimmed = iban.trim();
        if (!trimmed || isIbanStub(trimmed)) return null;
        if (!isValidIban(trimmed)) {
            throw new Error('invalid_iban');
        }
        const expected = selectedBank?.ibanBankCode?.toUpperCase() ?? null;
        if (expected) {
            const actual = nlIbanBankCode(trimmed);
            if (actual && actual !== expected) {
                throw new Error(
                    t('pages.settings.panels.bank.iban_bank_mismatch', {
                        actual,
                        expected,
                        bank: selectedBank?.name ?? '',
                    })
                );
            }
        }
        return normalizeIban(trimmed);
    }

    const selectedBank = bankKey ? bankByKey.get(bankKey) : null;
    const selectedIbanCode = selectedBank?.ibanBankCode?.toUpperCase() ?? undefined;
    const ibanPlaceholder = selectedIbanCode
        ? formatNlIbanStub(selectedIbanCode)
        : t('pages.settings.panels.bank.iban_placeholder');
    const ibanHint = selectedIbanCode
        ? t('pages.settings.panels.bank.iban_hint_prefix', { code: selectedIbanCode })
        : t('pages.settings.panels.bank.iban_hint_optional');

    const createAccount = useMutation({
        mutationFn: async () => {
            if (!householdId) throw new Error('No household');
            const bank = bankKey ? bankByKey.get(bankKey) : null;
            let accountName = label.trim();
            if (!accountName && bank) accountName = bank.name;
            if (
                bank &&
                accountName &&
                !accountName.toLowerCase().includes(bank.name.toLowerCase())
            ) {
                accountName = `${bank.name} · ${accountName}`;
            }
            if (!accountName) throw new Error(t('pages.settings.panels.bank.name_required'));
            const resolvedIban = resolveIbanForSubmit();
            return api.money.accounts.create({
                householdId,
                name: accountName,
                iban: resolvedIban,
                kind,
                balance: 0,
            });
        },
        onSuccess: () => {
            resetAddForm();
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.accounts.list.key() });
            showToast(t('pages.settings.toasts.account_added'), 'success');
        },
        onError: error => {
            const raw = extractErrorMessage(error);
            const message = apiError(error);
            if (isIbanApiErrorMessage(raw) || /iban/i.test(message)) {
                setIbanError(message);
                showToast(message, 'error');
                return;
            }
            showToast(t('pages.settings.toasts.account_add_failed'), 'error');
        },
    });

    const accounts = accountsQuery.data ?? [];
    const kindLabel = (kind: string) => accountKindLabel(kind, t);

    const canSubmit =
        live &&
        !createAccount.isPending &&
        !ibanError &&
        Boolean(label.trim() || (bankKey && bankByKey.get(bankKey)?.name)) &&
        (customBank || Boolean(bankKey));

    return (
        <SettingsPanel>
            <SettingsInkCard
                eyebrow={t('pages.settings.panels.bank.eyebrow')}
                blurb={t('pages.settings.panels.bank.blurb')}
                badge={
                    <SettingsPill>{t('pages.settings.panels.bank.not_connected')}</SettingsPill>
                }>
                {bankList.length === 0 ? (
                    <p className="py-2.5 text-sm text-fg-muted">
                        {t('pages.settings.panels.bank.loading_banks')}
                    </p>
                ) : (
                    bankList.map((bank, i) => {
                        const mark = vendorMarkSrc({
                            key: bank.key,
                            name: bank.name,
                            logoDomain: bank.logoDomain,
                            website: bank.website,
                        });
                        return (
                            <SettingsRow key={bank.key} last={i === bankList.length - 1}>
                                <div className="flex min-w-0 items-center gap-2.5">
                                    <VendorMark name={mark.name} src={mark.src} size={22} />
                                    <SettingsRowLabel title={bank.name} />
                                </div>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="rounded-full font-mono text-[10px] tracking-[0.12em] uppercase"
                                    disabled
                                    onClick={() =>
                                        showToast(t('pages.settings.toasts.bank_coming'), 'info')
                                    }>
                                    {t('pages.settings.panels.bank.connect')}
                                </Button>
                            </SettingsRow>
                        );
                    })
                )}
            </SettingsInkCard>

            <SettingsInkCard
                eyebrow={t('pages.settings.panels.bank.manual_eyebrow')}
                blurb={t('pages.settings.panels.bank.manual_blurb')}
                badge={
                    <Button
                        size="sm"
                        variant="secondary"
                        className="rounded-full font-mono text-[10px] tracking-[0.12em] uppercase"
                        onClick={() => setAdding(true)}>
                        {t('pages.settings.panels.bank.add_account')}
                    </Button>
                }>
                {accounts.length === 0 ? (
                    <p className="py-2.5 text-sm text-fg-muted">
                        {t('pages.settings.panels.bank.no_accounts_yet')}
                    </p>
                ) : (
                    accounts.map((account, i) => {
                        const bank = resolveBankForAccount(account.name);
                        const mark = bank
                            ? vendorMarkSrc({
                                  key: bank.key,
                                  name: bank.name,
                                  logoDomain: bank.logoDomain,
                                  website: bank.website,
                              })
                            : null;
                        return (
                            <SettingsRow
                                key={account.id}
                                last={i === accounts.length - 1 && !adding}>
                                <div className="flex min-w-0 items-center gap-2.5">
                                    {mark ? (
                                        <VendorMark name={mark.name} src={mark.src} size={22} />
                                    ) : null}
                                    <SettingsRowLabel
                                        title={account.name}
                                        sub={`${account.iban ?? t('pages.settings.panels.bank.no_iban')} · ${formatMoney(account.balance)}`}
                                    />
                                </div>
                                <Badge>{kindLabel(account.kind)}</Badge>
                            </SettingsRow>
                        );
                    })
                )}

                {adding ? (
                    <div className="grid gap-3 border-t border-line py-2.5">
                        <div className="grid gap-2">
                            <span className="font-mono text-[10px] tracking-[0.14em] text-fg-faint uppercase">
                                {t('pages.settings.panels.bank.which_bank')}
                            </span>
                            {bankList.length === 0 ? (
                                <p className="text-sm text-fg-muted">
                                    {t('pages.settings.panels.bank.loading_banks')}
                                </p>
                            ) : (
                                <div className="grid gap-2">
                                    <PresetNameField
                                        value={
                                            customBank
                                                ? label
                                                : (bankByKey.get(bankKey ?? '')?.name ?? '')
                                        }
                                        onChange={value => {
                                            if (!customBank) {
                                                setCustomBank(true);
                                                setBankKey(null);
                                            }
                                            setLabel(value);
                                        }}
                                        options={bankNameOptions}
                                        placeholder={t('pages.settings.panels.bank.search_bank')}
                                        freeTextPlaceholder={t(
                                            'pages.settings.panels.bank.type_bank_name'
                                        )}
                                        lockPresets
                                        freeTextKeys={['OTHER']}
                                        initialLockedKey={
                                            customBank ? null : (bankKey ?? undefined)
                                        }
                                        disabled={!live}
                                        onClear={() => {
                                            setBankKey(null);
                                            setCustomBank(false);
                                            setLabel('');
                                        }}
                                        onSelect={opt => {
                                            if (opt.key === 'OTHER') {
                                                setCustomBank(true);
                                                setBankKey(null);
                                                setLabel('');
                                                return;
                                            }
                                            pickBank(opt.key);
                                        }}
                                    />
                                    <div className="flex flex-wrap gap-2">
                                        {bankList.slice(0, 8).map(bank => {
                                            const mark = vendorMarkSrc({
                                                key: bank.key,
                                                name: bank.name,
                                                logoDomain: bank.logoDomain,
                                                website: bank.website,
                                            });
                                            const selected = !customBank && bankKey === bank.key;
                                            return (
                                                <button
                                                    key={bank.key}
                                                    type="button"
                                                    disabled={!live}
                                                    onClick={() => pickBank(bank.key)}
                                                    className={cn(
                                                        'inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs transition-colors',
                                                        selected
                                                            ? 'border-accent bg-accent/10 text-fg'
                                                            : 'border-line text-fg-secondary hover:border-fg-faint hover:text-fg'
                                                    )}>
                                                    <VendorMark
                                                        name={mark.name}
                                                        src={mark.src}
                                                        size={18}
                                                    />
                                                    {bank.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                        <Field
                            label={t('pages.settings.panels.bank.account_label')}
                            htmlFor="acc-name"
                            hint={t('pages.settings.panels.bank.account_label_hint')}>
                            <Input
                                id="acc-name"
                                placeholder={
                                    bankKey
                                        ? t('pages.settings.panels.bank.bank_checking', {
                                              bank:
                                                  bankByKey.get(bankKey)?.name ??
                                                  t('pages.settings.panels.bank.bank_fallback'),
                                          })
                                        : t('pages.settings.panels.bank.operating_checking')
                                }
                                value={label}
                                onChange={event => setLabel(event.target.value)}
                                disabled={!live}
                            />
                        </Field>
                        <Field
                            label={t('pages.settings.panels.bank.iban')}
                            htmlFor="acc-iban"
                            hint={ibanError ?? ibanHint}>
                            <Input
                                id="acc-iban"
                                placeholder={ibanPlaceholder}
                                value={iban}
                                aria-invalid={Boolean(ibanError)}
                                onChange={event => {
                                    setIban(event.target.value);
                                    if (ibanError) setIbanError(null);
                                }}
                                onBlur={() => {
                                    const trimmed = iban.trim();
                                    if (!trimmed || isIbanStub(trimmed)) return;
                                    if (!isValidIban(trimmed)) {
                                        setIbanError(t('pages.settings.panels.bank.invalid_iban'));
                                        return;
                                    }
                                    const expected = selectedIbanCode ?? null;
                                    if (expected) {
                                        const actual = nlIbanBankCode(trimmed);
                                        if (actual && actual !== expected) {
                                            setIbanError(
                                                t(
                                                    'pages.settings.panels.bank.iban_bank_mismatch_short',
                                                    {
                                                        actual,
                                                        expected,
                                                        bank: selectedBank?.name ?? '',
                                                    }
                                                )
                                            );
                                            return;
                                        }
                                    }
                                    setIbanError(null);
                                    setIban(formatIban(trimmed));
                                }}
                                disabled={!live}
                            />
                        </Field>
                        <Field label={t('pages.settings.panels.bank.type')} htmlFor="acc-kind">
                            <Select
                                id="acc-kind"
                                value={kind}
                                onChange={event => setKind(event.target.value as AccountKind)}
                                disabled={!live}>
                                <option value={AccountKind.CHECKING}>
                                    {kindLabel(AccountKind.CHECKING)}
                                </option>
                                <option value={AccountKind.SAVINGS}>
                                    {kindLabel(AccountKind.SAVINGS)}
                                </option>
                                <option value={AccountKind.CREDIT}>
                                    {kindLabel(AccountKind.CREDIT)}
                                </option>
                                <option value={AccountKind.CASH}>
                                    {kindLabel(AccountKind.CASH)}
                                </option>
                                <option value={AccountKind.INVESTMENT}>
                                    {kindLabel(AccountKind.INVESTMENT)}
                                </option>
                            </Select>
                        </Field>
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" onClick={resetAddForm}>
                                {t('pages.settings.cancel')}
                            </Button>
                            <Button disabled={!canSubmit} onClick={() => createAccount.mutate()}>
                                {createAccount.isPending
                                    ? t('pages.settings.working')
                                    : t('pages.settings.panels.bank.add')}
                            </Button>
                        </div>
                    </div>
                ) : null}
            </SettingsInkCard>
        </SettingsPanel>
    );
}

export function GrowthSettings() {
    const t = useTranslations();
    const [horizon, setHorizon] = useState(24);

    return (
        <SettingsPanel>
            <SettingsInkCard
                eyebrow={t('pages.settings.panels.growth.eyebrow')}
                blurb={t('pages.settings.panels.growth.blurb')}>
                <div className="flex flex-wrap items-center gap-3 py-3">
                    <input
                        type="range"
                        min={6}
                        max={60}
                        step={3}
                        value={horizon}
                        onChange={event => setHorizon(Number(event.target.value))}
                        className="min-w-0 flex-1 accent-(--color-accent)"
                        aria-label={t('pages.settings.panels.growth.horizon_aria')}
                    />
                    <Typography
                        as="h3"
                        size="lg"
                        weight="semibold"
                        color="primary"
                        className="whitespace-nowrap">
                        {t('pages.settings.panels.growth.months', { count: horizon })}
                    </Typography>
                </div>
            </SettingsInkCard>
            <StubNotice
                prefix={t('ui.statusPage.scaffold')}
                what={t('pages.settings.panels.growth.stub')}
            />
        </SettingsPanel>
    );
}

export function EnergySettings() {
    const t = useTranslations();
    const [weekHours, setWeekHours] = useState(48);
    const [sleepHours, setSleepHours] = useState(7.5);
    const [weightKg, setWeightKg] = useState(78);

    return (
        <SettingsPanel>
            <SettingsInkCard
                eyebrow={t('pages.settings.panels.energy.eyebrow')}
                blurb={t('pages.settings.panels.energy.blurb')}>
                <SettingsRow>
                    <span className="w-36 shrink-0 font-mono text-[9px] tracking-[0.14em] text-fg-faint uppercase">
                        {t('pages.settings.panels.energy.steered_label')}
                    </span>
                    <input
                        type="range"
                        min={20}
                        max={80}
                        step={1}
                        value={weekHours}
                        onChange={event => setWeekHours(Number(event.target.value))}
                        className="min-w-35 flex-1 accent-(--color-accent)"
                        aria-label={t('pages.settings.panels.energy.steered_aria')}
                    />
                    <span className="min-w-14 font-display text-lg font-semibold text-accent">
                        {weekHours}h
                    </span>
                </SettingsRow>
                <SettingsRow>
                    <span className="w-36 shrink-0 font-mono text-[9px] tracking-[0.14em] text-fg-faint uppercase">
                        {t('pages.settings.panels.energy.sleep_label')}
                    </span>
                    <input
                        type="range"
                        min={4}
                        max={11}
                        step={0.5}
                        value={sleepHours}
                        onChange={event => setSleepHours(Number(event.target.value))}
                        className="min-w-35 flex-1 accent-(--color-accent)"
                        aria-label={t('pages.settings.panels.energy.sleep_aria')}
                    />
                    <span className="min-w-14 font-display text-lg font-semibold text-accent">
                        {sleepHours}h
                    </span>
                </SettingsRow>
                <SettingsRow last>
                    <span className="w-36 shrink-0 font-mono text-[9px] tracking-[0.14em] text-fg-faint uppercase">
                        {t('pages.settings.panels.energy.weight_label')}
                    </span>
                    <input
                        type="range"
                        min={45}
                        max={140}
                        step={1}
                        value={weightKg}
                        onChange={event => setWeightKg(Number(event.target.value))}
                        className="min-w-35 flex-1 accent-(--color-accent)"
                        aria-label={t('pages.settings.panels.energy.weight_aria')}
                    />
                    <span className="min-w-14 font-display text-lg font-semibold text-accent">
                        {weightKg} kg
                    </span>
                </SettingsRow>
            </SettingsInkCard>
            <StubNotice
                prefix={t('ui.statusPage.scaffold')}
                what={t('pages.settings.panels.energy.stub')}
            />
        </SettingsPanel>
    );
}

export function SoulSettings() {
    const t = useTranslations();
    const [mindMin, setMindMin] = useState(10);

    return (
        <SettingsPanel>
            <SettingsInkCard
                eyebrow={t('pages.settings.panels.stillness.eyebrow')}
                blurb={t('pages.settings.panels.stillness.blurb')}>
                <div className="flex flex-wrap items-center gap-3 py-3">
                    <input
                        type="range"
                        min={1}
                        max={45}
                        step={1}
                        value={mindMin}
                        onChange={event => setMindMin(Number(event.target.value))}
                        className="min-w-0 flex-1 accent-(--color-accent)"
                        aria-label={t('pages.settings.panels.stillness.minutes_aria')}
                    />
                    <span className="font-display text-xl font-semibold tracking-tight whitespace-nowrap text-accent">
                        {t('pages.settings.panels.stillness.minutes', { count: mindMin })}
                    </span>
                </div>
            </SettingsInkCard>
            <StubNotice
                prefix={t('ui.statusPage.scaffold')}
                what={t('pages.settings.panels.stillness.stub')}
            />
        </SettingsPanel>
    );
}

export function AutomationSettings() {
    const t = useTranslations();
    const queryClient = useQueryClient();
    const { householdId } = useAuth();
    const { showToast } = useAppShell();
    const apiError = useApiError();
    const live = isLiveData(householdId);

    const householdQuery = useLiveQuery(
        apiQuery.household.current.queryOptions({ input: { householdId: householdId! } }),
        null,
        live
    );

    const [hhNameDraft, setHhNameDraft] = useState<string | null>(null);
    const hhName = hhNameDraft ?? householdQuery.data?.name ?? '';

    const [rules, setRules] = useState(
        () =>
            Object.fromEntries(AUTO_RULE_KEYS.map(key => [key, AUTO_RULE_DEFAULTS[key]])) as Record<
                string,
                boolean
            >
    );

    const saveHouseholdName = useMutation({
        mutationFn: async () => {
            if (!householdId) throw new Error('No household');
            await updateOrganization(householdId, { name: hhName.trim() });
        },
        onSuccess: () => {
            setHhNameDraft(null);
            void queryClient.invalidateQueries({ queryKey: apiQuery.household.current.key() });
            void queryClient.invalidateQueries({ queryKey: apiQuery.household.list.key() });
            showToast(t('pages.settings.toasts.household_updated'), 'success');
        },
        onError: (error: unknown) => showToast(apiError(error), 'error'),
    });

    return (
        <SettingsPanel>
            <SettingsInkCard
                eyebrow={t('pages.settings.panels.automation.eyebrow')}
                blurb={t('pages.settings.panels.automation.blurb')}>
                {AUTO_RULE_KEYS.map((key, i) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => setRules(prev => ({ ...prev, [key]: !prev[key] }))}
                        className={cn(
                            'flex w-full flex-wrap items-center justify-between gap-2 py-2.5 text-left',
                            i < AUTO_RULE_KEYS.length - 1 && 'border-b border-line'
                        )}>
                        <SettingsRowLabel
                            title={t(`pages.settings.panels.automation.rules.${key}.name`)}
                            sub={t(`pages.settings.panels.automation.rules.${key}.desc`)}
                        />
                        <span
                            className={cn(
                                'relative h-5 w-9 shrink-0 rounded-full transition-colors',
                                rules[key] ? 'bg-accent' : 'bg-raised'
                            )}>
                            <span
                                className={cn(
                                    'absolute top-0.5 size-3.5 rounded-full bg-surface transition-[left]',
                                    rules[key] ? 'left-[18px]' : 'left-0.5'
                                )}
                            />
                        </span>
                    </button>
                ))}
            </SettingsInkCard>

            <SettingsInkCard
                eyebrow={t('pages.settings.panels.automation.household_name')}
                blurb={t('pages.settings.panels.automation.household_blurb')}>
                <div className="grid gap-3 py-2.5">
                    <Field label={t('pages.settings.panels.automation.name')} htmlFor="hh-name">
                        <Input
                            id="hh-name"
                            value={hhName}
                            onChange={event => setHhNameDraft(event.target.value)}
                            disabled={!live}
                        />
                    </Field>
                    <div className="flex justify-end">
                        <Button
                            variant="secondary"
                            disabled={!live || saveHouseholdName.isPending || !hhName.trim()}
                            onClick={() => saveHouseholdName.mutate()}>
                            {saveHouseholdName.isPending
                                ? t('pages.settings.working')
                                : t('pages.settings.save')}
                        </Button>
                    </div>
                </div>
            </SettingsInkCard>

            <StubNotice
                prefix={t('ui.statusPage.scaffold')}
                what={t('pages.settings.panels.automation.stub')}
            />
        </SettingsPanel>
    );
}

export function PlanSettings() {
    const t = useTranslations();
    const appLocale = useLocale();
    const queryClient = useQueryClient();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { householdId, user } = useAuth();
    const { showToast, plan, setPlan } = useAppShell();
    const apiError = useApiError();
    const [billing, setBilling] = useState<'month' | 'year'>('month');
    const [pendingPlan, setPendingPlan] = useState<PlanKey | null>(null);
    const isDemoAccount = isDemoAccountEmail(user?.email);

    const billingStatus = useLiveQuery(
        apiQuery.billing.status.queryOptions({ input: { householdId: householdId! } }),
        {
            stripeEnabled: false,
            previewBypass: false,
            planKey: PlanKey.BASIC,
            periodEndsAt: null,
            periodStartedAt: null,
            willCancelAtPeriodEnd: false,
            scheduledPlanKey: null,
            hasStripeCustomer: false,
            hasActiveSubscription: false,
            prices: null,
        },
        Boolean(householdId) && !PREVIEW_MODE
    );

    /** Stripe Checkout / Portal when backend reports stripeEnabled. */
    const stripeLive = !PREVIEW_MODE && billingStatus.data?.stripeEnabled;
    /** Explicit free switches (preview mode or BILLING_PREVIEW_BYPASS). */
    const freePlanSwitch = PREVIEW_MODE || billingStatus.data?.previewBypass;
    /** No Stripe and no bypass — paid upgrades blocked; stay on Basic. */
    const billingUnavailable = !stripeLive && !freePlanSwitch;
    const pendingDiff = pendingPlan ? diffPlans(plan, pendingPlan, t) : null;
    const pendingNeedsCheckout =
        Boolean(pendingPlan) &&
        pendingPlan !== PlanKey.BASIC &&
        stripeLive &&
        pendingDiff?.direction === 'upgrade';
    const pendingPeriodEndDowngrade =
        Boolean(pendingPlan) && stripeLive && pendingDiff?.direction === 'downgrade';

    // Return from Checkout or Customer Portal — refresh entitlement from webhooks.
    useEffect(() => {
        const checkoutResult = searchParams.get('checkout');
        const billingReturn = searchParams.get('billing');
        if (!checkoutResult && billingReturn !== 'return') return;

        void queryClient.invalidateQueries({ queryKey: apiQuery.household.settings.key() });
        void queryClient.invalidateQueries({ queryKey: apiQuery.billing.status.key() });

        if (checkoutResult === 'success') {
            showToast(t('pages.settings.toasts.payment_received'), 'success');
            clearPlanIntent({
                domainUrls: [env.NEXT_PUBLIC_DOMAIN_WEB, env.NEXT_PUBLIC_DOMAIN_APP],
            });
        } else if (billingReturn === 'return') {
            showToast(t('pages.settings.toasts.billing_updated'), 'info');
        }

        router.replace('/settings/general/plan');
    }, [searchParams, queryClient, router, showToast, t]);

    const savePlan = useMutation({
        mutationFn: async (next: PlanKey) => {
            if (!householdId) throw new Error('No household');
            return api.household.updateSettings({ householdId, planKey: next });
        },
        onSuccess: data => {
            setPlan(data.planKey);
            setPendingPlan(null);
            void queryClient.invalidateQueries({ queryKey: apiQuery.household.settings.key() });
            void queryClient.invalidateQueries({ queryKey: apiQuery.billing.status.key() });
            showToast(
                t('pages.settings.toasts.plan_selected', { plan: planLabel(data.planKey, t) }),
                'success'
            );
        },
        onError: (error: unknown) => showToast(apiError(error), 'error'),
    });

    const scheduleDowngrade = useMutation({
        mutationFn: async (next: typeof PlanKey.BASIC | typeof PlanKey.PLUS) => {
            if (!householdId) throw new Error('No household');
            return api.billing.schedulePlanChange({ householdId, planKey: next });
        },
        onSuccess: data => {
            setPlan(data.planKey);
            setPendingPlan(null);
            void queryClient.invalidateQueries({ queryKey: apiQuery.household.settings.key() });
            void queryClient.invalidateQueries({ queryKey: apiQuery.billing.status.key() });
            const until = data.periodEndsAt
                ? new Date(data.periodEndsAt).toLocaleDateString(appLocale, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                  })
                : null;
            const nextLabel = data.scheduledPlanKey ? planLabel(data.scheduledPlanKey, t) : null;
            showToast(
                until && nextLabel
                    ? t('pages.settings.toasts.plan_until_then', {
                          plan: planLabel(data.planKey, t),
                          until,
                          next: nextLabel,
                      })
                    : t('pages.settings.toasts.plan_kept_until', {
                          plan: planLabel(data.planKey, t),
                      }),
                'success'
            );
        },
        onError: (error: unknown) => showToast(apiError(error), 'error'),
    });

    const checkout = useMutation({
        mutationFn: async (next: typeof PlanKey.PLUS | typeof PlanKey.MAX) => {
            if (!householdId) throw new Error('No household');
            return api.billing.createCheckoutSession({
                householdId,
                planKey: next,
                interval: billing,
            });
        },
        onSuccess: ({ url, applied }, next) => {
            if (url) {
                window.location.assign(url);
                return;
            }
            if (applied) {
                setPlan(next);
                setPendingPlan(null);
                void queryClient.invalidateQueries({ queryKey: apiQuery.household.settings.key() });
                void queryClient.invalidateQueries({ queryKey: apiQuery.billing.status.key() });
                showToast(
                    t('pages.settings.toasts.plan_upgraded', { plan: planLabel(next, t) }),
                    'success'
                );
            }
        },
        onError: (error: unknown) => showToast(apiError(error), 'error'),
    });

    const openPortal = useMutation({
        mutationFn: async () => {
            if (!householdId) throw new Error('No household');
            return api.billing.createPortalSession({ householdId });
        },
        onSuccess: ({ url }) => {
            window.location.assign(url);
        },
        onError: (error: unknown) => showToast(apiError(error), 'error'),
    });

    function choosePlan(next: PlanKey) {
        if (isDemoAccount) {
            showToast(t('pages.settings.toasts.demo_plan'), 'info');
            return;
        }
        if (plan === next) {
            showToast(
                t('pages.settings.toasts.already_on_plan', { plan: planLabel(next, t) }),
                'info'
            );
            return;
        }
        const upgrading = PLAN_RANK[next] > PLAN_RANK[plan];
        if (upgrading && billingUnavailable) {
            showToast(t('pages.settings.toasts.stripe_unconfigured'), 'error');
            return;
        }
        setPendingPlan(next);
    }

    function confirmPlanChange() {
        if (!pendingPlan || !pendingDiff) return;
        if (pendingDiff.direction === 'upgrade' && billingUnavailable) {
            showToast(t('pages.settings.toasts.stripe_unconfigured'), 'error');
            setPendingPlan(null);
            return;
        }
        if (pendingNeedsCheckout && (pendingPlan === PlanKey.PLUS || pendingPlan === PlanKey.MAX)) {
            checkout.mutate(pendingPlan);
            return;
        }
        if (
            pendingPeriodEndDowngrade &&
            (pendingPlan === PlanKey.BASIC || pendingPlan === PlanKey.PLUS)
        ) {
            scheduleDowngrade.mutate(pendingPlan);
            return;
        }
        // Free preview bypass, or downgrade without Stripe
        savePlan.mutate(pendingPlan);
    }

    const busy =
        savePlan.isPending ||
        checkout.isPending ||
        scheduleDowngrade.isPending ||
        openPortal.isPending ||
        billingStatus.isLoading;
    const scheduledPlanKey = billingStatus.data?.scheduledPlanKey ?? null;
    const periodEndsAt = billingStatus.data?.periodEndsAt ?? null;
    const hasActiveSubscription = billingStatus.data?.hasActiveSubscription;

    const cards: {
        key: PlanKey;
        /** Fallback major units when Stripe catalog is unavailable. */
        priceM: number;
        priceY: number;
        tag: string;
        line: string;
        feats: string;
    }[] = [
        {
            key: PlanKey.BASIC,
            priceM: 0,
            priceY: 0,
            tag: t('pages.settings.panels.plan.card_basic_tag', {
                price: formatPlanPrice(0),
            }),
            line: t('pages.settings.panels.plan.card_basic_line'),
            feats: t('pages.settings.panels.plan.card_basic_feats', {
                members: memberLimitLabel(PlanKey.BASIC, t),
            }),
        },
        {
            key: PlanKey.PLUS,
            priceM: 9,
            priceY: 90,
            tag: t('pages.settings.panels.plan.card_plus_tag'),
            line: t('pages.settings.panels.plan.card_plus_line'),
            feats: t('pages.settings.panels.plan.card_plus_feats', {
                members: memberLimitLabel(PlanKey.PLUS, t),
            }),
        },
        {
            key: PlanKey.MAX,
            priceM: 19,
            priceY: 190,
            tag: t('pages.settings.panels.plan.card_max_tag'),
            line: t('pages.settings.panels.plan.card_max_line'),
            feats: t('pages.settings.panels.plan.card_max_feats', {
                members: memberLimitLabel(PlanKey.MAX, t),
            }),
        },
    ];

    const stripePrices = billingStatus.data?.prices;

    function displayCents(card: (typeof cards)[number], yearly: boolean): number {
        if (card.key === PlanKey.BASIC) return 0;
        const slot =
            card.key === PlanKey.PLUS
                ? yearly
                    ? stripePrices?.PLUS.year
                    : stripePrices?.PLUS.month
                : yearly
                  ? stripePrices?.MAX.year
                  : stripePrices?.MAX.month;
        if (slot) return slot.amountCents;
        return (yearly ? card.priceY : card.priceM) * 100;
    }
    return (
        <SettingsPanel>
            <SettingsInkCard
                eyebrow={t('pages.settings.panels.plan.eyebrow')}
                blurb={t('pages.settings.panels.plan.blurb')}
                badge={
                    <div className="flex gap-1 rounded-full bg-raised p-1">
                        {(
                            [
                                ['month', t('pages.settings.panels.plan.monthly')],
                                ['year', t('pages.settings.panels.plan.yearly')],
                            ] as const
                        ).map(([k, label]) => (
                            <button
                                key={k}
                                type="button"
                                onClick={() => setBilling(k)}
                                className={cn(
                                    'rounded-full px-3.5 py-2 font-mono text-[10px] font-medium tracking-wide uppercase',
                                    billing === k
                                        ? 'bg-accent text-on-accent'
                                        : 'text-fg-muted hover:text-fg'
                                )}>
                                {label}
                            </button>
                        ))}
                    </div>
                }>
                <div className="grid gap-2 py-2.5">
                    {cards.map(card => {
                        const yearly = billing === 'year';
                        const cur = plan === card.key;
                        const cents = displayCents(card, yearly);
                        const price = formatPlanPrice(cents);
                        return (
                            <div
                                key={card.key}
                                className={cn(
                                    'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-l-[3px] px-3.5 py-3',
                                    cur
                                        ? 'border-accent/40 border-l-accent bg-accent-soft'
                                        : 'border-line border-l-line bg-surface'
                                )}>
                                <div className="grid min-w-0 gap-1">
                                    <span className="flex flex-wrap items-baseline gap-2">
                                        <Typography as="h3" weight="semibold">
                                            {planLabel(card.key, t)}
                                        </Typography>
                                        <span className="font-display text-lg font-semibold tracking-tight text-accent">
                                            {price}
                                        </span>
                                        {cents > 0 ? (
                                            <span className="font-mono text-[10px] text-fg-muted">
                                                {yearly
                                                    ? t(
                                                          'pages.settings.panels.plan.per_year_suffix'
                                                      )
                                                    : t(
                                                          'pages.settings.panels.plan.per_month_suffix'
                                                      )}
                                            </span>
                                        ) : null}
                                        <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[8px] tracking-widest text-fg-secondary uppercase">
                                            {card.tag}
                                        </span>
                                        {cur && scheduledPlanKey && periodEndsAt ? (
                                            <span className="font-mono text-[10px] tracking-wide text-fg-muted uppercase">
                                                {t('pages.settings.panels.plan.scheduled_until', {
                                                    until: new Date(
                                                        periodEndsAt
                                                    ).toLocaleDateString(appLocale, {
                                                        month: 'short',
                                                        day: 'numeric',
                                                    }),
                                                    next: planLabel(scheduledPlanKey, t),
                                                })}
                                            </span>
                                        ) : null}
                                    </span>
                                    <p className="line-clamp-2 text-xs leading-snug text-fg-muted">
                                        {card.line}
                                    </p>
                                    <span className="line-clamp-1 font-mono text-[10px] text-fg-faint">
                                        {card.feats}
                                    </span>
                                </div>
                                <Button
                                    variant={cur ? 'secondary' : 'primary'}
                                    size="sm"
                                    className="shrink-0 rounded-full font-mono text-[10px] tracking-widest uppercase"
                                    disabled={
                                        busy ||
                                        isDemoAccount ||
                                        cur ||
                                        (billingUnavailable &&
                                            PLAN_RANK[card.key] > PLAN_RANK[plan])
                                    }
                                    onClick={() => choosePlan(card.key)}>
                                    {cur
                                        ? t('pages.settings.panels.plan.status_current')
                                        : isDemoAccount
                                          ? t('pages.settings.panels.plan.status_locked')
                                          : billingUnavailable &&
                                              PLAN_RANK[card.key] > PLAN_RANK[plan]
                                            ? t('pages.settings.panels.plan.status_unavailable')
                                            : busy
                                              ? '…'
                                              : PLAN_RANK[card.key] < PLAN_RANK[plan]
                                                ? t('pages.settings.panels.plan.downgrade')
                                                : card.key === PlanKey.BASIC
                                                  ? t('pages.settings.panels.plan.choose_basic')
                                                  : t('pages.settings.panels.plan.upgrade')}
                                </Button>
                            </div>
                        );
                    })}
                </div>
            </SettingsInkCard>

            {stripeLive && !isDemoAccount ? (
                <SettingsInkCard
                    eyebrow={t('pages.settings.panels.plan.payment_eyebrow')}
                    blurb={
                        hasActiveSubscription
                            ? t('pages.settings.panels.plan.payment_blurb_active')
                            : t('pages.settings.panels.plan.payment_blurb_inactive')
                    }>
                    <div className="flex flex-wrap items-center justify-between gap-3 py-2">
                        <p className="text-xs leading-snug text-fg-muted">
                            {hasActiveSubscription
                                ? t('pages.settings.panels.plan.portal_hint_active')
                                : t('pages.settings.panels.plan.portal_hint_inactive')}
                        </p>
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="shrink-0 rounded-full font-mono text-[10px] tracking-widest uppercase"
                            disabled={busy}
                            onClick={() => openPortal.mutate()}>
                            {openPortal.isPending
                                ? '…'
                                : t('pages.settings.panels.plan.manage_billing')}
                        </Button>
                    </div>
                </SettingsInkCard>
            ) : null}

            <PlanChangeDialog
                open={pendingPlan !== null}
                diff={pendingDiff}
                busy={busy}
                stripeCheckout={pendingNeedsCheckout}
                periodEndDowngrade={pendingPeriodEndDowngrade}
                periodEndsAt={periodEndsAt}
                onOpenChange={open => {
                    if (!open) setPendingPlan(null);
                }}
                onConfirm={confirmPlanChange}
            />
            <StubNotice
                prefix={t('ui.statusPage.scaffold')}
                what={
                    isDemoAccount
                        ? t('pages.settings.panels.plan.stub_demo')
                        : PREVIEW_MODE || freePlanSwitch
                          ? t('pages.settings.panels.plan.stub_preview')
                          : billingUnavailable
                            ? t('pages.settings.panels.plan.stub_stripe')
                            : t('pages.settings.panels.plan.stub_billing')
                }
            />
        </SettingsPanel>
    );
}

export function ExportSettings() {
    const t = useTranslations();
    const { householdId } = useAuth();
    const { showToast, period } = useAppShell();
    const live = isLiveData(householdId);
    const [busy, setBusy] = useState<'csv' | 'json' | null>(null);
    const [scope, setScope] = useState<'all' | 'tx' | 'month'>('all');

    async function exportCsv(periodOnly: boolean) {
        if (!householdId) return;
        setBusy('csv');
        try {
            const periodKey = toPeriodKey(period.year, period.month);
            const { items } = await api.money.transactions.list({
                householdId,
                limit: 200,
                ...(periodOnly ? { period: periodKey } : {}),
            });
            const jars = await api.money.jars.list({ householdId });
            const jarName = new Map(jars.map(j => [j.id, j.name]));
            const rows = items.map(transaction => ({
                id: transaction.id,
                bookedOn: transaction.bookedOn,
                description: transaction.description,
                counterparty: transaction.counterparty ?? '',
                amountCents: transaction.amount,
                status: transaction.status,
                jar: transaction.jarId ? (jarName.get(transaction.jarId) ?? transaction.jarId) : '',
                categoryId: transaction.categoryId ?? '',
            }));
            const stamp = periodOnly ? periodKey : new Date().toISOString().slice(0, 10);
            downloadTextFile(
                `rumtelo-transactions-${stamp}.csv`,
                toCsv(rows),
                'text/csv;charset=utf-8'
            );
            showToast(
                t(
                    rows.length === 1
                        ? 'pages.settings.toasts.csv_exported_one'
                        : 'pages.settings.toasts.csv_exported_other',
                    {
                        count: String(rows.length),
                        periodSuffix: periodOnly
                            ? t('pages.settings.toasts.csv_period_suffix', { period: periodKey })
                            : '',
                    }
                ),
                'success'
            );
        } catch {
            showToast(t('pages.settings.toasts.csv_failed'), 'error');
        } finally {
            setBusy(null);
        }
    }

    async function exportJson() {
        if (!householdId) return;
        setBusy('json');
        try {
            const [jars, income, fixedCosts, debts, goals, rules, transactions] = await Promise.all(
                [
                    api.money.jars.list({ householdId }),
                    api.money.income.list({ householdId }),
                    api.money.fixedCosts.list({ householdId }),
                    api.money.debts.list({ householdId }),
                    api.money.goals.list({ householdId }),
                    api.money.rules.list({ householdId }),
                    api.money.transactions.list({ householdId, limit: 200 }),
                ]
            );
            const payload = {
                exportedAt: new Date().toISOString(),
                householdId,
                jars,
                income,
                fixedCosts,
                debts,
                goals,
                rules,
                transactions: transactions.items,
            };
            const stamp = new Date().toISOString().slice(0, 10);
            downloadTextFile(
                `rumtelo-export-${stamp}.json`,
                JSON.stringify(payload, null, 2),
                'application/json'
            );
            showToast(t('pages.settings.toasts.export_ok'), 'success');
        } catch {
            showToast(t('pages.settings.toasts.json_failed'), 'error');
        } finally {
            setBusy(null);
        }
    }

    const periodKey = toPeriodKey(period.year, period.month);

    const sheets = [
        {
            name: t('pages.settings.panels.export.sheet_jars'),
            rows: t('pages.settings.panels.export.sheet_jars_rows'),
            cols: t('pages.settings.panels.export.sheet_jars_cols'),
            fullOnly: true,
        },
        {
            name: t('pages.settings.panels.export.sheet_income'),
            rows: t('pages.settings.panels.export.sheet_income_rows'),
            cols: t('pages.settings.panels.export.sheet_income_cols'),
            fullOnly: true,
        },
        {
            name: t('pages.settings.panels.export.sheet_fixed'),
            rows: t('pages.settings.panels.export.sheet_fixed_rows'),
            cols: t('pages.settings.panels.export.sheet_fixed_cols'),
            fullOnly: true,
        },
        {
            name: t('pages.settings.panels.export.sheet_transactions'),
            rows:
                scope === 'month'
                    ? t('pages.settings.panels.export.sheet_transactions_rows_month')
                    : t('pages.settings.panels.export.sheet_transactions_rows_ledger'),
            cols: t('pages.settings.panels.export.sheet_transactions_cols'),
            fullOnly: false,
        },
        {
            name: t('pages.settings.panels.export.sheet_debts'),
            rows: t('pages.settings.panels.export.sheet_debts_rows'),
            cols: t('pages.settings.panels.export.sheet_debts_cols'),
            fullOnly: true,
        },
        {
            name: t('pages.settings.panels.export.sheet_goals'),
            rows: t('pages.settings.panels.export.sheet_goals_rows'),
            cols: t('pages.settings.panels.export.sheet_goals_cols'),
            fullOnly: true,
        },
        {
            name: t('pages.settings.panels.export.sheet_rules'),
            rows: t('pages.settings.panels.export.sheet_rules_rows'),
            cols: t('pages.settings.panels.export.sheet_rules_cols'),
            fullOnly: true,
        },
    ];

    const scopes = [
        {
            key: 'all' as const,
            label: t('pages.settings.panels.export.scope_everything'),
            desc: t('pages.settings.panels.export.scope_everything_desc'),
        },
        {
            key: 'tx' as const,
            label: t('pages.settings.panels.export.scope_tx'),
            desc: t('pages.settings.panels.export.scope_tx_desc'),
        },
        {
            key: 'month' as const,
            label: t('pages.settings.panels.export.this_month'),
            desc: t('pages.settings.panels.export.scope_month_desc', { period: periodKey }),
        },
    ];

    const visibleSheets = sheets.filter(sheet => scope === 'all' || !sheet.fullOnly);

    return (
        <SettingsPanel>
            <SettingsInkCard
                eyebrow={t('pages.settings.panels.export.eyebrow')}
                blurb={t('pages.settings.panels.export.blurb')}>
                <div className="grid gap-2.5 border-b border-line py-2.5">
                    <p className="font-mono text-[9px] font-medium tracking-[0.14em] text-fg-faint uppercase">
                        {t('pages.settings.panels.export.what_goes_in')}
                    </p>
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-2.5">
                        {scopes.map(option => {
                            const on = scope === option.key;
                            return (
                                <button
                                    key={option.key}
                                    type="button"
                                    onClick={() => setScope(option.key)}
                                    className={cn(
                                        'grid gap-1 rounded-[13px] border p-3.5 text-left transition-colors',
                                        on
                                            ? 'border-accent bg-accent-soft'
                                            : 'border-line hover:border-accent/40'
                                    )}>
                                    <span className="flex items-baseline justify-between gap-2">
                                        <span
                                            className={cn(
                                                'text-[13.5px] font-semibold',
                                                on ? 'text-accent' : 'text-fg'
                                            )}>
                                            {option.label}
                                        </span>
                                        {on ? (
                                            <span className="font-mono text-[11px] text-accent">
                                                ✦
                                            </span>
                                        ) : null}
                                    </span>
                                    <span className="font-mono text-[10px] leading-snug text-fg-muted">
                                        {option.desc}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="grid gap-1.5 border-b border-line py-2.5">
                    <p className="font-mono text-[9px] font-medium tracking-[0.14em] text-fg-faint uppercase">
                        {t('pages.settings.panels.export.tabs_heading')}
                    </p>
                    <div className="grid gap-1">
                        {visibleSheets.map(sh => (
                            <span
                                key={sh.name}
                                className="flex flex-wrap items-baseline gap-2 rounded-lg border border-line bg-raised px-2.5 py-1.5">
                                <span className="shrink-0 text-xs font-semibold text-fg">
                                    {sh.name}
                                </span>
                                <span className="shrink-0 font-mono text-[10px] text-accent">
                                    {sh.rows}
                                </span>
                                <span className="min-w-0 font-mono text-[10px] leading-snug text-fg-muted">
                                    {sh.cols}
                                </span>
                            </span>
                        ))}
                    </div>
                </div>

                <div className="grid gap-2 py-2.5">
                    <div className="flex flex-wrap gap-2.5">
                        <Button
                            className="min-w-0 flex-1 rounded-full font-mono text-[10.5px] tracking-[0.13em] uppercase sm:min-w-[190px]"
                            disabled={!live || busy !== null}
                            onClick={() => {
                                showToast(t('pages.settings.panels.export.excel_coming'), 'info');
                            }}>
                            {t('pages.settings.panels.export.download_excel')}
                        </Button>
                        <Button
                            variant="secondary"
                            className="min-w-0 flex-1 rounded-full font-mono text-[10.5px] tracking-[0.13em] uppercase sm:min-w-[190px]"
                            disabled={!live || busy !== null}
                            onClick={() => {
                                if (scope === 'all') void exportJson();
                                else void exportCsv(scope === 'month');
                            }}>
                            {busy
                                ? t('pages.settings.working')
                                : scope === 'all'
                                  ? t('pages.settings.panels.export.download_json')
                                  : t('pages.settings.panels.export.download_csv')}
                        </Button>
                    </div>
                    <p className="font-mono text-[10.5px] leading-relaxed text-pretty text-fg-muted">
                        {t('pages.settings.panels.export.format_note')}
                    </p>
                    {!live ? (
                        <StubNotice
                            prefix={t('ui.statusPage.scaffold')}
                            what={t('pages.settings.panels.export.sign_in_stub')}
                        />
                    ) : null}
                </div>
            </SettingsInkCard>
        </SettingsPanel>
    );
}
