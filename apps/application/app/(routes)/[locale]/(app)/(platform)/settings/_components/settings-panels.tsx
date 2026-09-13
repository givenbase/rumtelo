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
    Locale,
    SpendingStyle,
    PayoffStrategy,
    Theme,
    canAddHouseholdMember,
    canInviteOnPlan,
    type JarKey,
} from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import {
    Badge,
    Button,
    DangerZone,
    Field,
    Input,
    Meter,
    Select,
    StubNotice,
    Toggle,
} from '@rumtelo/ui';
import {
    clearPlanIntent,
    cn,
    DEFAULT_CURRENCY,
    formatMoney as formatMoneyExplicit,
    formatPercent,
    formatPlanPrice,
    sumMonthly,
    toPeriodKey,
} from '@rumtelo/utils';

import { changePassword, signOut, updateOrganization } from '@/app/_lib/auth';
import { env } from '@/app/_utils/get-env';
import { useAccountTheme } from '@/components/features/shell/account-theme-sync';
import { downloadTextFile, toCsv } from '@/app/_lib/download';
import {
    CAPABILITIES,
    diffPlans,
    lockCopyFor,
    memberLimitLabel,
    PLAN_LABELS,
    PLAN_RANK,
    PlanKey,
} from '@/app/_lib/plan';
import { isLiveData, PREVIEW_MODE } from '@/app/_lib/preview';
import { isDemoAccountEmail } from '@rumtelo/contracts/platform';
import { evaluateSplitCoach, pctByJarKey } from '@/app/_lib/split-coach';
import { JAR_META } from '@/app/_lib/jar-meta';
import { chrome as tourChrome, usePageTour } from '@/components/features/tour';
import { useFeatureHelpers } from '@/components/features/helpers';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';

import {
    SettingsInkCard,
    SettingsPanel,
    SettingsPill,
    SettingsRow,
    SettingsRowLabel,
} from './settings-chrome';
import { PlanChangeDialog } from './plan-change-dialog';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';

const JAR_COLOR: Record<string, string> = Object.fromEntries(JAR_META.map(j => [j.key, j.color]));

const CURRENCY_OPTIONS = [
    { code: Currency.EUR, sampleLocale: 'nl-NL', persist: true as const },
    { code: Currency.USD, sampleLocale: 'en-US', persist: true as const },
    { code: Currency.GBP, sampleLocale: 'en-GB', persist: true as const },
    { code: 'CHF', sampleLocale: 'de-CH', persist: false as const },
];

const BANK_OPTIONS = ['ING', 'Rabobank', 'ABN AMRO', 'bunq', 'Revolut', 'N26'] as const;

const AUTO_RULES = [
    {
        key: 'split',
        name: 'Auto-split on income',
        desc: 'Everything that arrives goes straight into the jars, 55/10/10/10/10/5.',
        defaultOn: true,
    },
    {
        key: 'guard',
        name: 'Jar guard',
        desc: 'Warn as soon as a jar passes 90% of its allocation.',
        defaultOn: true,
    },
    {
        key: 'sweep',
        name: 'Sweep surplus',
        desc: 'Whatever is left in Necessity on the 1st moves to Financial Freedom.',
        defaultOn: true,
    },
] as const;

function initials(name: string, email: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
        return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
    }
    if (parts[0]?.length) return parts[0].slice(0, 2).toUpperCase();
    return (email.slice(0, 2) || '?').toUpperCase();
}

export function AccountSettings() {
    const queryClient = useQueryClient();
    const router = useRouter();
    const { session, householdId, refreshSession } = useAuth();
    const { showToast, locale, toggleLocale, plan } = useAppShell();
    const { restartFullTour } = usePageTour();
    const { helpersEnabled, setHelpersEnabled } = useFeatureHelpers();
    const live = isLiveData(householdId);

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
    const inviteCopy = lockCopyFor(CAPABILITIES.platformInvite, PlanKey.PLUS);

    const currency =
        settingsQuery.data?.currency ?? householdQuery.data?.currency ?? DEFAULT_CURRENCY;
    const [currencyDraft, setCurrencyDraft] = useState<string | null>(null);
    const activeCurrency = currencyDraft ?? currency;

    const { accountTheme, setAccountTheme } = useAccountTheme();
    const activeTheme = accountTheme ?? Theme.SYSTEM;
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
            showToast('Profile saved', 'success');
        },
        onError: () => showToast('Profile save failed', 'error'),
    });

    const savePassword = useMutation({
        mutationFn: async () => {
            const result = await changePassword({
                currentPassword,
                newPassword,
                revokeOtherSessions: true,
            });
            if (result.error) throw new Error(result.error.message ?? 'Password change failed');
        },
        onSuccess: () => {
            setCurrentPassword('');
            setNewPassword('');
            showToast('Password changed', 'success');
        },
        onError: () => showToast('Password change failed', 'error'),
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
            showToast('Invitation sent', 'success');
        },
        onError: () => showToast('Invitation failed', 'error'),
    });

    const saveLocale = useMutation({
        mutationFn: async (next: Locale) => {
            return api.account.updateSettings({ locale: next });
        },
        onSuccess: (_data, next) => {
            if (locale !== next) toggleLocale();
            void queryClient.invalidateQueries({ queryKey: apiQuery.account.settings.key() });
            showToast('Language saved', 'success');
        },
        onError: () => showToast('Language save failed', 'error'),
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
            showToast('Currency saved', 'success');
        },
        onError: () => showToast('Currency save failed', 'error'),
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
            showToast('Period saved', 'success');
        },
        onError: () => showToast('Period save failed', 'error'),
    });

    const saveTheme = useMutation({
        mutationFn: async (next: Theme) => setAccountTheme(next),
        onError: () => showToast('Theme save failed', 'error'),
    });

    const saveSpendingStyle = useMutation({
        mutationFn: async (next: SpendingStyle) => {
            return api.account.updateSettings({ spendingStyle: next });
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: apiQuery.account.settings.key() });
            showToast('Money style saved', 'success');
        },
        onError: () => showToast('Money style save failed', 'error'),
    });

    const saveIncomeStability = useMutation({
        mutationFn: async (next: IncomeStability) => {
            if (!householdId) throw new Error('No household');
            return api.household.updateSettings({ householdId, money: { incomeStability: next } });
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: apiQuery.household.settings.key() });
            showToast('Income stability saved', 'success');
        },
        onError: () => showToast('Income stability save failed', 'error'),
    });

    function pickLocale(next: Locale) {
        if (live) saveLocale.mutate(next);
        else if (locale !== next) toggleLocale();
    }

    function pickCurrency(code: string, persist: boolean) {
        if (!persist) {
            showToast('CHF support is coming soon', 'info');
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
            showToast('Sign out failed', 'error');
            setSigningOut(false);
        }
    }

    const displayName = profileQuery.data?.displayName?.trim() || user?.name?.trim() || 'Guest';
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
                eyebrow="Profile"
                blurb="Greeting name starts from your legal name at signup — change it anytime. Legal name, phone, and birthday live on your account.">
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
                                    aria-label="Display name"
                                    placeholder="Display name"
                                />
                                <p className="truncate font-mono text-[10px] text-fg-muted">
                                    {displayEmail}
                                </p>
                            </div>
                        ) : (
                            <span className="grid min-w-0 gap-px">
                                <span className="truncate text-sm text-fg">{displayName}</span>
                                <span className="truncate font-mono text-[10px] text-fg-muted">
                                    {displayEmail || '—'}
                                </span>
                            </span>
                        )}
                    </div>
                    {editingName ? (
                        <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setEditingName(false)}>
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                disabled={saveProfile.isPending || !nameDraft.trim()}
                                onClick={() => saveProfile.mutate()}>
                                {saveProfile.isPending ? '…' : 'Save'}
                            </Button>
                        </div>
                    ) : (
                        <Button
                            variant="secondary"
                            size="sm"
                            className="rounded-full font-mono text-[10px] tracking-[0.12em] uppercase"
                            onClick={beginEditProfile}>
                            Edit
                        </Button>
                    )}
                </SettingsRow>

                {editingName ? (
                    <div className="grid gap-2 border-t border-line pt-3 sm:grid-cols-2">
                        <Input
                            value={firstNameDraft}
                            onChange={event => setFirstNameDraft(event.target.value)}
                            aria-label="First name"
                            placeholder="First name"
                        />
                        <Input
                            value={middleNameDraft}
                            onChange={event => setMiddleNameDraft(event.target.value)}
                            aria-label="Middle name"
                            placeholder="Middle name (optional)"
                        />
                        <Input
                            value={lastNameDraft}
                            onChange={event => setLastNameDraft(event.target.value)}
                            aria-label="Last name"
                            placeholder="Last name"
                        />
                        <Input
                            type="tel"
                            value={phoneDraft}
                            onChange={event => setPhoneDraft(event.target.value)}
                            aria-label="Phone"
                            placeholder="Phone (optional)"
                        />
                        <Input
                            type="date"
                            value={dobDraft}
                            onChange={event => setDobDraft(event.target.value)}
                            aria-label="Date of birth"
                        />
                    </div>
                ) : profileQuery.data ? (
                    <SettingsRow>
                        <SettingsRowLabel
                            title={
                                [profileQuery.data.firstName, profileQuery.data.lastName]
                                    .filter(Boolean)
                                    .join(' ') || 'Legal name'
                            }
                            sub={
                                [
                                    profileQuery.data.phone,
                                    profileQuery.data.dateOfBirth
                                        ? `Born ${profileQuery.data.dateOfBirth}`
                                        : null,
                                ]
                                    .filter(Boolean)
                                    .join(' · ') || 'Add name, phone, and date of birth'
                            }
                        />
                    </SettingsRow>
                ) : null}

                <SettingsRow>
                    <SettingsRowLabel title="Sign-in method" sub="Email, through Better Auth" />
                    <SettingsPill tone="accent">Connected</SettingsPill>
                </SettingsRow>

                <SettingsRow>
                    <SettingsRowLabel
                        title="Two-factor"
                        sub="A code from your phone on every new device"
                    />
                    <SettingsPill tone="neutral">Off</SettingsPill>
                </SettingsRow>

                <SettingsRow>
                    <SettingsRowLabel title="Language" sub="Applies to every screen" />
                    <div className="flex gap-1 rounded-full border border-line bg-raised p-0.5">
                        {([Locale.EN, Locale.NL] as const).map(code => {
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
                    <SettingsRowLabel title="Currency" sub="How every amount is written" />
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
                                            locale: opt.sampleLocale,
                                        })}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </SettingsRow>

                <SettingsRow last>
                    <SettingsRowLabel
                        title="Sign out"
                        sub="You stay signed in for 30 days on this device"
                    />
                    <Button
                        variant="secondary"
                        size="sm"
                        className="rounded-full border-danger/40 font-mono text-[10px] tracking-[0.12em] text-danger uppercase hover:border-danger"
                        disabled={signingOut}
                        onClick={() => void handleSignOut()}>
                        {signingOut ? '…' : 'Sign out'}
                    </Button>
                </SettingsRow>
            </SettingsInkCard>

            <SettingsInkCard
                eyebrow="How you handle money"
                blurb="Personal style — partners can differ. Tips on the jar split use this. Debt payoff order lives under Debt settings for the whole board.">
                <SettingsRow>
                    <SettingsRowLabel title="I tend to…" sub="Descriptive, never a verdict" />
                    <div className="flex flex-wrap justify-end gap-1.5">
                        {(
                            [
                                {
                                    key: SpendingStyle.SPENDER,
                                    label: 'Spender',
                                    sub: 'Joy first',
                                },
                                {
                                    key: SpendingStyle.SAVER,
                                    label: 'Saver',
                                    sub: 'Future first',
                                },
                                {
                                    key: SpendingStyle.BALANCED,
                                    label: 'Balanced',
                                    sub: 'Both',
                                },
                                {
                                    key: SpendingStyle.UNKNOWN,
                                    label: 'Not sure',
                                    sub: 'Neutral tips',
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
                        title="Income month to month"
                        sub="Shared board picture — steady, uneven, or none right now"
                    />
                    <div className="flex flex-wrap gap-1 rounded-full border border-line bg-raised p-0.5">
                        {(
                            [
                                { key: IncomeStability.STABLE, label: 'Stable' },
                                { key: IncomeStability.VARIABLE, label: 'Variable' },
                                { key: IncomeStability.NONE, label: 'None' },
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

            <SettingsInkCard eyebrow="Password" blurb="Change the password for this email account.">
                <div className="grid gap-3 py-2.5">
                    <Field label="Current password" htmlFor="cur-pw">
                        <Input
                            id="cur-pw"
                            type="password"
                            value={currentPassword}
                            onChange={event => setCurrentPassword(event.target.value)}
                            placeholder="••••••••••••"
                            autoComplete="current-password"
                        />
                    </Field>
                    <Field label="New password" htmlFor="new-pw" hint="Minimum 8 characters.">
                        <Input
                            id="new-pw"
                            type="password"
                            value={newPassword}
                            onChange={event => setNewPassword(event.target.value)}
                            placeholder="••••••••••••"
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
                            {savePassword.isPending ? 'Working…' : 'Change password'}
                        </Button>
                    </div>
                </div>
            </SettingsInkCard>

            <SettingsInkCard
                eyebrow="Household"
                blurb={`${memberLimitLabel(activePlan)}. Members share jars, rules, and transaction history.`}>
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
                        <StubNotice what="Members appear here once you have a household." />
                    )}
                    {!invitesAllowed ? (
                        <p className="text-sm text-fg-muted">
                            {inviteCopy.line}{' '}
                            <span className="font-medium text-fg">{inviteCopy.cta}</span>
                        </p>
                    ) : !seatOpen ? (
                        <p className="text-sm text-fg-muted">
                            Seat limit reached ({memberLimitLabel(activePlan)}). Upgrade to Max for
                            unlimited members.
                        </p>
                    ) : (
                        <>
                            <Field label="Invite (email)" htmlFor="invite-email">
                                <Input
                                    id="invite-email"
                                    type="email"
                                    value={inviteEmail}
                                    onChange={event => setInviteEmail(event.target.value)}
                                    placeholder="partner@example.com"
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
                                    {invite.isPending ? 'Working…' : 'Invite'}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </SettingsInkCard>

            <SettingsInkCard
                eyebrow="Display"
                blurb="Theme and the day the budget month rolls over.">
                <SettingsRow>
                    <SettingsRowLabel
                        title="Appearance"
                        sub="Synced to your account across browsers and devices."
                    />
                    <div className="flex gap-1 rounded-full border border-line bg-raised p-0.5">
                        {(
                            [
                                { value: Theme.SYSTEM, label: 'System' },
                                { value: Theme.LIGHT, label: 'Light' },
                                { value: Theme.DARK, label: 'Dark' },
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
                            label="Day the month rolls over"
                            htmlFor="period-day"
                            hint="Income after this day counts for next month.">
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
                            {savePeriod.isPending ? 'Working…' : 'Save'}
                        </Button>
                    </div>
                </SettingsRow>
            </SettingsInkCard>

            <SettingsInkCard
                eyebrow="The Coach"
                blurb="The Coach never scolds — only clear next moves. On-screen tips (why-lines, jar cards) stay on while you learn; the inbox at Overview → The Coach holds tip cards across money, growth, energy, and soul.">
                <Toggle
                    checked={helpersEnabled}
                    label="Show The Coach on screens"
                    hint={
                        helpersEnabled
                            ? 'On — look for the ✦ The Coach mark. Inbox stays at Overview → The Coach.'
                            : 'Off — on-screen tips hidden. The Coach inbox still available anytime.'
                    }
                    onCheckedChange={setHelpersEnabled}
                />
            </SettingsInkCard>

            <SettingsInkCard
                eyebrow={tourChrome.settings.eyebrow}
                blurb={tourChrome.settings.blurb}>
                <SettingsRow last>
                    <SettingsRowLabel
                        title={tourChrome.settings.row_title}
                        sub={tourChrome.settings.row_sub}
                    />
                    <Button type="button" variant="secondary" onClick={restartFullTour}>
                        {tourChrome.settings.restart}
                    </Button>
                </SettingsRow>
            </SettingsInkCard>

            <DangerZone
                title="Delete account"
                body="Your household, jars, and full transaction history will be deleted. This cannot be undone — export your data first."
                action="Delete account"
                onAction={() =>
                    showToast('Account deletion coming soon — export your data first.', 'info')
                }
            />
        </SettingsPanel>
    );
}

export function JarsSettings() {
    const queryClient = useQueryClient();
    const { householdId } = useAuth();
    const { showToast } = useAppShell();
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
    const accounts = accountsQuery.data ?? [];
    const serverPct = useMemo(
        () => Object.fromEntries(jars.map(j => [j.id, j.percentage])),
        [jars]
    );
    const [pctDraft, setPctDraft] = useState<Record<string, number> | null>(null);
    const [dismissedTips, setDismissedTips] = useState<Record<string, true>>({});
    const pct = pctDraft ?? serverPct;

    const total = Object.values(pct).reduce((running, value) => running + value, 0);
    const balanced = Math.abs(total - 100) < 0.01;

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
            showToast('Split saved', 'success');
        },
        onError: () => showToast('Split save failed', 'error'),
    });

    function resetDefaults() {
        const next: Record<string, number> = {};
        for (const jar of jars) {
            next[jar.id] = DEFAULT_JAR_SPLIT[jar.key as JarKey] ?? jar.percentage;
        }
        setPctDraft(next);
        setDismissedTips({});
    }

    const defaultAccountLabel = (() => {
        const account = accounts[0];
        if (!account) return null;
        return `${account.name}${account.iban ? ` · ${account.iban.slice(-4)}` : ''}`;
    })();

    return (
        <SettingsPanel>
            <SettingsInkCard
                eyebrow="Where each jar sits"
                blurb="Mix freely — Necessity on your current account, the rest as pots, Financial Freedom on a real savings account."
                badge={
                    <SettingsPill tone="accent">
                        {accounts.length
                            ? `${accounts.length} account${accounts.length === 1 ? '' : 's'}`
                            : 'No accounts'}
                    </SettingsPill>
                }>
                {jars.map((jar, i) => (
                    <SettingsRow key={jar.id} last={i === jars.length - 1}>
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
                                        defaultAccountLabel ? 'text-fg-secondary' : 'text-warning'
                                    )}>
                                    {defaultAccountLabel ?? 'Not set — add a bank account'}
                                </span>
                            </span>
                        </span>
                        <Button
                            variant="secondary"
                            size="sm"
                            className="rounded-full font-mono text-[10px] tracking-[0.12em] uppercase"
                            onClick={() =>
                                showToast(
                                    'Jar → account mapping saves with bank accounts — coming soon.',
                                    'info'
                                )
                            }>
                            Change
                        </Button>
                    </SettingsRow>
                ))}
            </SettingsInkCard>

            <SettingsInkCard
                eyebrow="Income split"
                blurb="Where income goes on arrival — must total 100%."
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
                                Coach
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
                                    <p className="text-xs leading-snug text-fg">{tip.message}</p>
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
                                        Got it
                                    </Button>
                                </div>
                            ))}
                        </div>
                    ) : null}

                    <div className="flex justify-end gap-2 border-t border-line py-2">
                        <Button variant="ghost" size="sm" onClick={resetDefaults}>
                            Reset
                        </Button>
                        <Button
                            size="sm"
                            disabled={!live || !balanced || saveSplit.isPending}
                            onClick={() => saveSplit.mutate()}>
                            {saveSplit.isPending ? 'Working…' : 'Save'}
                        </Button>
                    </div>
                    {!live ? (
                        <div className="pb-2">
                            <StubNotice what="Sign in and complete setup to save the split." />
                        </div>
                    ) : null}
                </div>
            </SettingsInkCard>
        </SettingsPanel>
    );
}

export function DebtSettings() {
    const queryClient = useQueryClient();
    const { householdId } = useAuth();
    const { showToast } = useAppShell();
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
            showToast('Payoff method saved', 'success');
        },
        onError: () => showToast('Payoff method save failed', 'error'),
    });

    return (
        <SettingsPanel>
            <SettingsInkCard
                eyebrow="How you pay off debt"
                blurb="Sets the order Rumtelo recommends on the Debt screen for this household. Switch any time — nothing is lost."
                badge={
                    <SettingsPill tone="accent">
                        {strategy === PayoffStrategy.AVALANCHE ? 'Avalanche' : 'Snowball'}
                    </SettingsPill>
                }>
                {(
                    [
                        {
                            key: PayoffStrategy.AVALANCHE,
                            name: 'Avalanche',
                            tag: 'Cheapest',
                            desc: 'Highest interest rate first. Costs least over the full payoff.',
                            metric: 'Interest saved · Freedom date sooner on expensive debt',
                        },
                        {
                            key: PayoffStrategy.SNOWBALL,
                            name: 'Snowball',
                            tag: 'Momentum',
                            desc: 'Smallest balance first. Clears debts faster for a quick win.',
                            metric: 'Wins sooner · Slightly more interest overall',
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

    const [name, setName] = useState('');
    const [iban, setIban] = useState('');
    const [kind, setKind] = useState<AccountKind>(AccountKind.CHECKING);
    const [adding, setAdding] = useState(false);

    const createAccount = useMutation({
        mutationFn: async () => {
            if (!householdId) throw new Error('No household');
            return api.money.accounts.create({
                householdId,
                name: name.trim(),
                iban: iban.trim() || null,
                kind,
                balance: 0,
            });
        },
        onSuccess: () => {
            setName('');
            setIban('');
            setKind(AccountKind.CHECKING);
            setAdding(false);
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.accounts.list.key() });
            showToast('Account added', 'success');
        },
        onError: () => showToast('Account add failed', 'error'),
    });

    const accounts = accountsQuery.data ?? [];
    const kindLabel: Record<string, string> = {
        CHECKING: 'Checking',
        SAVINGS: 'Savings',
        CREDIT: 'Credit card',
        CASH: 'Cash',
        INVESTMENT: 'Investment',
    };

    return (
        <SettingsPanel>
            <SettingsInkCard
                eyebrow="Bank connection"
                blurb="Read-only — Rumtelo never moves money. Disconnect any time."
                badge={<SettingsPill>Not connected</SettingsPill>}>
                {BANK_OPTIONS.map((bank, i) => (
                    <SettingsRow key={bank} last={i === BANK_OPTIONS.length - 1}>
                        <SettingsRowLabel title={bank} />
                        <Button
                            variant="secondary"
                            size="sm"
                            className="rounded-full font-mono text-[10px] tracking-[0.12em] uppercase"
                            disabled
                            onClick={() => showToast('Bank connect coming soon', 'info')}>
                            Connect
                        </Button>
                    </SettingsRow>
                ))}
            </SettingsInkCard>

            <SettingsInkCard
                eyebrow="Manual accounts"
                blurb="CSV import always works. Add accounts here for recognition during import."
                badge={
                    <Button
                        size="sm"
                        variant="secondary"
                        className="rounded-full font-mono text-[10px] tracking-[0.12em] uppercase"
                        onClick={() => setAdding(true)}>
                        + Add account
                    </Button>
                }>
                {accounts.length === 0 ? (
                    <p className="py-2.5 text-sm text-fg-muted">No accounts yet.</p>
                ) : (
                    accounts.map((account, i) => (
                        <SettingsRow key={account.id} last={i === accounts.length - 1 && !adding}>
                            <SettingsRowLabel
                                title={account.name}
                                sub={`${account.iban ?? 'No IBAN'} · ${formatMoney(account.balance)}`}
                            />
                            <Badge>{kindLabel[account.kind] ?? account.kind}</Badge>
                        </SettingsRow>
                    ))
                )}

                {adding ? (
                    <div className="grid gap-3 border-t border-line py-2.5">
                        <Field label="Name" htmlFor="acc-name">
                            <Input
                                id="acc-name"
                                placeholder="Checking account"
                                value={name}
                                onChange={event => setName(event.target.value)}
                                disabled={!live}
                            />
                        </Field>
                        <Field
                            label="IBAN"
                            htmlFor="acc-iban"
                            hint="Optional — only for recognition during import.">
                            <Input
                                id="acc-iban"
                                placeholder="NL00 BANK 0000 0000 00"
                                value={iban}
                                onChange={event => setIban(event.target.value)}
                                disabled={!live}
                            />
                        </Field>
                        <Field label="Type" htmlFor="acc-kind">
                            <Select
                                id="acc-kind"
                                value={kind}
                                onChange={event => setKind(event.target.value as AccountKind)}
                                disabled={!live}>
                                <option value={AccountKind.CHECKING}>Checking</option>
                                <option value={AccountKind.SAVINGS}>Savings</option>
                                <option value={AccountKind.CREDIT}>Credit card</option>
                                <option value={AccountKind.CASH}>Cash</option>
                                <option value={AccountKind.INVESTMENT}>Investment</option>
                            </Select>
                        </Field>
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" onClick={() => setAdding(false)}>
                                Cancel
                            </Button>
                            <Button
                                disabled={!live || createAccount.isPending || !name.trim()}
                                onClick={() => createAccount.mutate()}>
                                {createAccount.isPending ? 'Working…' : 'Add'}
                            </Button>
                        </div>
                    </div>
                ) : null}
            </SettingsInkCard>
        </SettingsPanel>
    );
}

export function GrowthSettings() {
    const [horizon, setHorizon] = useState(24);

    return (
        <SettingsPanel>
            <SettingsInkCard
                eyebrow="Planning horizon"
                blurb="How far ahead the goal and freedom calculations look. Shorter feels urgent, longer shows the compounding.">
                <div className="flex flex-wrap items-center gap-3 py-3">
                    <input
                        type="range"
                        min={6}
                        max={60}
                        step={3}
                        value={horizon}
                        onChange={event => setHorizon(Number(event.target.value))}
                        className="min-w-0 flex-1 accent-(--color-accent)"
                        aria-label="Planning horizon in months"
                    />
                    <span className="font-display text-xl font-semibold tracking-tight whitespace-nowrap text-accent">
                        {horizon} months
                    </span>
                </div>
            </SettingsInkCard>
            <StubNotice what="Horizon persists with growth settings when that API lands." />
        </SettingsPanel>
    );
}

export function EnergySettings() {
    const [weekHours, setWeekHours] = useState(48);
    const [sleepHours, setSleepHours] = useState(7.5);
    const [weightKg, setWeightKg] = useState(78);

    return (
        <SettingsPanel>
            <SettingsInkCard
                eyebrow="Your baseline"
                blurb="Three numbers the Energy portal builds on. Everything else — sessions, targets, advice — is derived from these.">
                <SettingsRow>
                    <span className="w-36 shrink-0 font-mono text-[9px] tracking-[0.14em] text-fg-faint uppercase">
                        Steered hours p/w
                    </span>
                    <input
                        type="range"
                        min={20}
                        max={80}
                        step={1}
                        value={weekHours}
                        onChange={event => setWeekHours(Number(event.target.value))}
                        className="min-w-35 flex-1 accent-(--color-accent)"
                        aria-label="Steered hours per week"
                    />
                    <span className="min-w-14 font-display text-lg font-semibold text-accent">
                        {weekHours}h
                    </span>
                </SettingsRow>
                <SettingsRow>
                    <span className="w-36 shrink-0 font-mono text-[9px] tracking-[0.14em] text-fg-faint uppercase">
                        Sleep per night
                    </span>
                    <input
                        type="range"
                        min={4}
                        max={11}
                        step={0.5}
                        value={sleepHours}
                        onChange={event => setSleepHours(Number(event.target.value))}
                        className="min-w-35 flex-1 accent-(--color-accent)"
                        aria-label="Sleep hours per night"
                    />
                    <span className="min-w-14 font-display text-lg font-semibold text-accent">
                        {sleepHours}h
                    </span>
                </SettingsRow>
                <SettingsRow last>
                    <span className="w-36 shrink-0 font-mono text-[9px] tracking-[0.14em] text-fg-faint uppercase">
                        Weight
                    </span>
                    <input
                        type="range"
                        min={45}
                        max={140}
                        step={1}
                        value={weightKg}
                        onChange={event => setWeightKg(Number(event.target.value))}
                        className="min-w-35 flex-1 accent-(--color-accent)"
                        aria-label="Weight in kilograms"
                    />
                    <span className="min-w-14 font-display text-lg font-semibold text-accent">
                        {weightKg} kg
                    </span>
                </SettingsRow>
            </SettingsInkCard>
            <StubNotice what="Wearable sync and persistence — coming soon." />
        </SettingsPanel>
    );
}

export function SoulSettings() {
    const [mindMin, setMindMin] = useState(10);

    return (
        <SettingsPanel>
            <SettingsInkCard
                eyebrow="Your daily stillness"
                blurb="How long you sit. Short and daily beats long and occasional — this is the one practice that costs nothing and protects every jar.">
                <div className="flex flex-wrap items-center gap-3 py-3">
                    <input
                        type="range"
                        min={1}
                        max={45}
                        step={1}
                        value={mindMin}
                        onChange={event => setMindMin(Number(event.target.value))}
                        className="min-w-0 flex-1 accent-(--color-accent)"
                        aria-label="Daily stillness minutes"
                    />
                    <span className="font-display text-xl font-semibold tracking-tight whitespace-nowrap text-accent">
                        {mindMin} min
                    </span>
                </div>
            </SettingsInkCard>
            <StubNotice what="Intention templates and reminders — coming soon." />
        </SettingsPanel>
    );
}

export function AutomationSettings() {
    const queryClient = useQueryClient();
    const { householdId } = useAuth();
    const { showToast } = useAppShell();
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
            Object.fromEntries(AUTO_RULES.map(rule => [rule.key, rule.defaultOn])) as Record<
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
            showToast('Household updated', 'success');
        },
        onError: () => showToast('Household save failed', 'error'),
    });

    return (
        <SettingsPanel>
            <SettingsInkCard
                eyebrow="What Rumtelo does by itself"
                blurb="Three rules. Everything off means Rumtelo only shows, never acts. The Coach settings live under Account.">
                {AUTO_RULES.map((rule, i) => (
                    <button
                        key={rule.key}
                        type="button"
                        onClick={() => setRules(prev => ({ ...prev, [rule.key]: !prev[rule.key] }))}
                        className={cn(
                            'flex w-full flex-wrap items-center justify-between gap-2 py-2.5 text-left',
                            i < AUTO_RULES.length - 1 && 'border-b border-line'
                        )}>
                        <SettingsRowLabel title={rule.name} sub={rule.desc} />
                        <span
                            className={cn(
                                'relative h-5 w-9 shrink-0 rounded-full transition-colors',
                                rules[rule.key] ? 'bg-accent' : 'bg-raised'
                            )}>
                            <span
                                className={cn(
                                    'absolute top-0.5 size-3.5 rounded-full bg-surface transition-[left]',
                                    rules[rule.key] ? 'left-[18px]' : 'left-0.5'
                                )}
                            />
                        </span>
                    </button>
                ))}
            </SettingsInkCard>

            <SettingsInkCard
                eyebrow="Household name"
                blurb="Shown in the shell and on shared invites.">
                <div className="grid gap-3 py-2.5">
                    <Field label="Name" htmlFor="hh-name">
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
                            {saveHouseholdName.isPending ? 'Working…' : 'Save'}
                        </Button>
                    </div>
                </div>
            </SettingsInkCard>

            <StubNotice what="Automation rules persist with household settings when that API lands. The Coach is under Account. Theme and language live under Account too." />
        </SettingsPanel>
    );
}

export function PlanSettings() {
    const queryClient = useQueryClient();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { householdId, user } = useAuth();
    const { showToast, plan, setPlan } = useAppShell();
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
            isCancelAtPeriodEnd: false,
            scheduledPlanKey: null,
            hasStripeCustomer: false,
            hasActiveSubscription: false,
            prices: null,
        },
        Boolean(householdId) && !PREVIEW_MODE
    );

    /** Stripe Checkout / Portal when backend reports stripeEnabled. */
    const stripeLive = !PREVIEW_MODE && billingStatus.data?.stripeEnabled === true;
    /** Explicit free switches (preview mode or BILLING_PREVIEW_BYPASS). */
    const freePlanSwitch = PREVIEW_MODE || billingStatus.data?.previewBypass === true;
    /** No Stripe and no bypass — paid upgrades blocked; stay on Basic. */
    const billingUnavailable = !stripeLive && !freePlanSwitch;
    const pendingDiff = pendingPlan ? diffPlans(plan, pendingPlan) : null;
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
            showToast('Payment received — plan updates when Stripe confirms', 'success');
            clearPlanIntent({
                domainUrls: [env.NEXT_PUBLIC_DOMAIN_WEB, env.NEXT_PUBLIC_DOMAIN_APP],
            });
        } else if (billingReturn === 'return') {
            showToast('Billing updated — syncing from Stripe', 'info');
        }

        router.replace('/settings/general/plan');
    }, [searchParams, queryClient, router, showToast]);

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
            showToast(`${PLAN_LABELS[data.planKey]} selected`, 'success');
        },
        onError: () => showToast('Could not update plan', 'error'),
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
                ? new Date(data.periodEndsAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                  })
                : null;
            const nextLabel = data.scheduledPlanKey
                ? PLAN_LABELS[data.scheduledPlanKey as PlanKey]
                : null;
            showToast(
                until && nextLabel
                    ? `${PLAN_LABELS[data.planKey]} until ${until}, then ${nextLabel}`
                    : `${PLAN_LABELS[data.planKey]} kept until period end`,
                'success'
            );
        },
        onError: () => showToast('Could not schedule plan change', 'error'),
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
                showToast(`${PLAN_LABELS[next]} upgraded`, 'success');
            }
        },
        onError: () => showToast('Could not start Stripe Checkout', 'error'),
    });

    const openPortal = useMutation({
        mutationFn: async () => {
            if (!householdId) throw new Error('No household');
            return api.billing.createPortalSession({ householdId });
        },
        onSuccess: ({ url }) => {
            window.location.assign(url);
        },
        onError: () =>
            showToast(
                'Could not open Stripe billing portal — enable Customer Portal in Stripe Dashboard',
                'error'
            ),
    });

    function choosePlan(next: PlanKey) {
        if (isDemoAccount) {
            showToast('Demo accounts stay on their seeded plan', 'info');
            return;
        }
        if (plan === next) {
            showToast(`Already on ${PLAN_LABELS[next]}`, 'info');
            return;
        }
        const upgrading = PLAN_RANK[next] > PLAN_RANK[plan];
        if (upgrading && billingUnavailable) {
            showToast('Paid plans are unavailable until Stripe billing is configured', 'error');
            return;
        }
        setPendingPlan(next);
    }

    function confirmPlanChange() {
        if (!pendingPlan || !pendingDiff) return;
        if (pendingDiff.direction === 'upgrade' && billingUnavailable) {
            showToast('Paid plans are unavailable until Stripe billing is configured', 'error');
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
    const hasActiveSubscription = billingStatus.data?.hasActiveSubscription === true;

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
            tag: `From ${formatPlanPrice(0)}`,
            line: 'Solo board — the six jars and the practice underneath. No bank needed.',
            feats: `${memberLimitLabel(PlanKey.BASIC)} · Solo only · MONEY jars · Coach`,
        },
        {
            key: PlanKey.PLUS,
            priceM: 9,
            priceY: 90,
            tag: 'Most chosen',
            line: 'Share the board with family or friends — debt, energy week, and goals.',
            feats: `${memberLimitLabel(PlanKey.PLUS)} · Any household kind · Debt · ENERGY · Goals`,
        },
        {
            key: PlanKey.MAX,
            priceM: 19,
            priceY: 190,
            tag: 'All four portals',
            line: 'Unlimited household, income curve, learning, and net worth.',
            feats: `${memberLimitLabel(PlanKey.MAX)} · GROWTH · Income · Learning · Net worth`,
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
                eyebrow="What you use and pay"
                blurb="Three plans: Basic, Plus, and Max. Start on Basic — nothing you have entered is ever locked away."
                badge={
                    <div className="flex gap-1 rounded-full bg-raised p-1">
                        {(
                            [
                                ['month', 'Monthly'],
                                ['year', 'Yearly · 2 months free'],
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
                                        <span className="font-display text-lg font-semibold tracking-tight text-fg">
                                            {PLAN_LABELS[card.key]}
                                        </span>
                                        <span className="font-display text-lg font-semibold tracking-tight text-accent">
                                            {price}
                                        </span>
                                        {cents > 0 ? (
                                            <span className="font-mono text-[10px] text-fg-muted">
                                                {yearly ? '/year' : '/month'}
                                            </span>
                                        ) : null}
                                        <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[8px] tracking-widest text-fg-secondary uppercase">
                                            {card.tag}
                                        </span>
                                        {cur && scheduledPlanKey && periodEndsAt ? (
                                            <span className="font-mono text-[10px] tracking-wide text-fg-muted uppercase">
                                                until{' '}
                                                {new Date(periodEndsAt).toLocaleDateString(
                                                    undefined,
                                                    {
                                                        month: 'short',
                                                        day: 'numeric',
                                                    }
                                                )}{' '}
                                                → {PLAN_LABELS[scheduledPlanKey as PlanKey]}
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
                                        ? 'Current'
                                        : isDemoAccount
                                          ? 'Locked'
                                          : billingUnavailable &&
                                              PLAN_RANK[card.key] > PLAN_RANK[plan]
                                            ? 'Unavailable'
                                            : busy
                                              ? '…'
                                              : PLAN_RANK[card.key] < PLAN_RANK[plan]
                                                ? 'Downgrade'
                                                : card.key === PlanKey.BASIC
                                                  ? 'Choose Basic'
                                                  : 'Upgrade'}
                                </Button>
                            </div>
                        );
                    })}
                </div>
            </SettingsInkCard>

            {stripeLive && !isDemoAccount ? (
                <SettingsInkCard
                    eyebrow="Payment & invoices"
                    blurb={
                        hasActiveSubscription
                            ? 'Update your card, download invoices, or change the subscription in Stripe. Changes sync back here via webhooks.'
                            : 'Add a payment method in Stripe before or after you upgrade. Subscription changes sync back here via webhooks.'
                    }>
                    <div className="flex flex-wrap items-center justify-between gap-3 py-2">
                        <p className="text-xs leading-snug text-fg-muted">
                            {hasActiveSubscription
                                ? 'Opens Stripe Customer Portal for this household.'
                                : 'Creates a Stripe customer for this household if needed.'}
                        </p>
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="shrink-0 rounded-full font-mono text-[10px] tracking-widest uppercase"
                            disabled={busy}
                            onClick={() => openPortal.mutate()}>
                            {openPortal.isPending ? '…' : 'Manage billing'}
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
                what={
                    isDemoAccount
                        ? 'Demo account — plan is fixed for this persona. Sign up with your own email to change plans.'
                        : PREVIEW_MODE || freePlanSwitch
                          ? 'Preview / bypass — plan switches are free (no Stripe Checkout).'
                          : billingUnavailable
                            ? 'Stripe not configured — paid upgrades are locked. Households stay on Basic until billing is enabled.'
                            : 'Upgrades charge now. Downgrades keep your current plan until the paid period ends. Manage card & invoices via Stripe Portal.'
                }
            />
        </SettingsPanel>
    );
}

export function ExportSettings() {
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
                `${rows.length} transaction${rows.length === 1 ? '' : 's'} exported${periodOnly ? ` for ${periodKey}` : ''}`,
                'success'
            );
        } catch {
            showToast('CSV export failed', 'error');
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
            showToast('Full export downloaded', 'success');
        } catch {
            showToast('JSON export failed', 'error');
        } finally {
            setBusy(null);
        }
    }

    const sheets = [
        { name: 'Jars', rows: '6 rows', cols: 'key · name · % · allocated', fullOnly: true },
        { name: 'Income', rows: 'sources', cols: 'label · amount · kind', fullOnly: true },
        { name: 'Fixed costs', rows: 'recurring', cols: 'name · amount · jar', fullOnly: true },
        {
            name: 'Transactions',
            rows: scope === 'month' ? 'this month' : 'ledger',
            cols: 'date · desc · amount · jar',
            fullOnly: false,
        },
        { name: 'Debts', rows: 'balances', cols: 'name · rate · balance', fullOnly: true },
        { name: 'Goals', rows: 'targets', cols: 'name · target · jar', fullOnly: true },
        { name: 'Rules', rows: 'automation', cols: 'match · jar · priority', fullOnly: true },
    ];

    const scopes = [
        {
            key: 'all' as const,
            label: 'Everything',
            desc: 'Every sheet in one JSON file',
        },
        {
            key: 'tx' as const,
            label: 'Transactions only',
            desc: 'All transactions as CSV',
        },
        {
            key: 'month' as const,
            label: 'This month only',
            desc: `Transactions for ${toPeriodKey(period.year, period.month)}`,
        },
    ];

    const visibleSheets = sheets.filter(sheet => scope === 'all' || !sheet.fullOnly);

    return (
        <SettingsPanel>
            <SettingsInkCard
                eyebrow="Everything to Excel or CSV"
                blurb="One file with a tab per subject — jars, income, fixed costs, transactions, debts, what you own, goals. Handy for your accountant, an administrator, or your own archive.">
                <div className="grid gap-2.5 border-b border-line py-2.5">
                    <p className="font-mono text-[9px] font-medium tracking-[0.14em] text-fg-faint uppercase">
                        What goes in
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
                        Tabs in the file
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
                                showToast(
                                    'Excel multi-sheet export coming soon — use CSV or JSON for now.',
                                    'info'
                                );
                            }}>
                            Download Excel (.xls)
                        </Button>
                        <Button
                            variant="secondary"
                            className="min-w-0 flex-1 rounded-full font-mono text-[10.5px] tracking-[0.13em] uppercase sm:min-w-[190px]"
                            disabled={!live || busy !== null}
                            onClick={() => {
                                if (scope === 'all') void exportJson();
                                else void exportCsv(scope === 'month');
                            }}>
                            {busy ? 'Working…' : scope === 'all' ? 'Download JSON' : 'Download CSV'}
                        </Button>
                    </div>
                    <p className="font-mono text-[10.5px] leading-relaxed text-pretty text-fg-muted">
                        Excel with a real tab per subject is coming. JSON is the full archive; CSV
                        is transactions only — pick this month when you want the current period.
                    </p>
                    {!live ? <StubNotice what="Sign in to download exports." /> : null}
                </div>
            </SettingsInkCard>
        </SettingsPanel>
    );
}
