'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { useMemo } from 'react';

import {
    HouseholdRole,
    IncomeStability,
    PlanKey,
    SpendingStyle,
    canAddHouseholdMember,
    canInviteOnPlan,
    isWritableHouseholdRole,
    planAllowsInviteRole,
} from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations } from '@rumtelo/i18n';
import {
    Badge,
    Button,
    Email,
    Field,
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
    StubNotice,
} from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';
import { CAPABILITIES, lockCopyFor, memberLimitLabel } from '@/app/_lib/plan';
import { isLiveData } from '@/app/_lib/preview';
import { canInviteWithRole } from '@/app/_lib/role-permissions';
import { useAuth } from '@/components/features/shell/auth-provider';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';

import { createInviteFormSchema, type InviteFormValues } from '../_utils/settings-form-zod';
import { useSettingsMutation } from '../_utils/use-settings-mutation';
import { SettingsInkCard, SettingsPanel, SettingsRow, SettingsRowLabel } from './settings-chrome';

/** Members, money style, household profile — `/settings/general/household`. */
export function HouseholdSettings() {
    const t = useTranslations();
    const { session, householdId } = useAuth();
    const { plan } = useHouseholdShell();
    const live = isLiveData(householdId);
    const user = session?.user;

    const inviteForm = useForm<InviteFormValues>({
        defaultValues: { email: '', role: HouseholdRole.VIEWER },
        resolver: zodResolver(createInviteFormSchema(t)),
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
    const billingStatusQuery = useLiveQuery(
        apiQuery.billing.status.queryOptions({ input: { householdId: householdId! } }),
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
    const members = membersQuery.data ?? [];
    const memberCount = members.length;
    const writableCount = members.filter(member => isWritableHouseholdRole(member.role)).length;
    const viewerCount = members.filter(member => member.role === HouseholdRole.VIEWER).length;
    const seatExtras = billingStatusQuery.data?.seatAddons ?? {
        extraContributor: 0,
        extraViewer: 0,
    };
    const myMember = members.find(member => member.userId === user?.id);
    const myRole = myMember?.role ?? HouseholdRole.VIEWER;
    const roleCanInvite = canInviteWithRole(myRole);
    const invitesAllowed = canInviteOnPlan(activePlan);
    const canInviteAdmin = planAllowsInviteRole(activePlan, HouseholdRole.ADMIN, seatExtras);
    const canInviteMember = planAllowsInviteRole(activePlan, HouseholdRole.MEMBER, seatExtras);
    const canInviteViewer = planAllowsInviteRole(activePlan, HouseholdRole.VIEWER, seatExtras);
    const inviteRole = useWatch({ control: inviteForm.control, name: 'role' });
    const seatOpen = canAddHouseholdMember(activePlan, {
        occupiedSeats: memberCount,
        writableCount,
        viewerCount,
        role: inviteRole ?? HouseholdRole.VIEWER,
        extras: seatExtras,
    });
    const inviteCopy = lockCopyFor(CAPABILITIES.platformInvite, PlanKey.BASIC, t);

    const invite = useSettingsMutation({
        mutationFn: async (values: InviteFormValues) => {
            if (!householdId) throw new Error('No household');
            return api.household.invite({
                householdId,
                email: values.email.trim(),
                role: values.role,
            });
        },
        invalidateKeys: [apiQuery.household.members.key()],
        successMessage: t('pages.settings.toasts.invitation_sent'),
        onSuccess: () =>
            inviteForm.reset({
                email: '',
                role: canInviteViewer
                    ? HouseholdRole.VIEWER
                    : canInviteMember
                      ? HouseholdRole.MEMBER
                      : HouseholdRole.ADMIN,
            }),
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

    return (
        <SettingsPanel>
            <SettingsInkCard
                eyebrow={t('pages.settings.panels.household.eyebrow')}
                blurb={`${memberLimitLabel(activePlan, t)}. ${t('pages.settings.panels.household.blurb_suffix')}`}>
                <div className="grid gap-3 py-2.5">
                    {live && members.length > 0 ? (
                        <ul className="divide-y divide-line rounded-lg border border-line">
                            {members.map(member => (
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
                    {!roleCanInvite ? (
                        <p className="text-sm text-fg-muted">
                            {t('common.message.error.api.viewer_read_only')}
                        </p>
                    ) : !invitesAllowed ? (
                        <p className="text-sm text-fg-muted">
                            {inviteCopy.line}{' '}
                            <span className="font-medium text-fg">{inviteCopy.cta}</span>
                        </p>
                    ) : !seatOpen ? (
                        <div className="grid gap-2">
                            <p className="text-sm text-fg-muted">
                                {t('pages.settings.panels.household.seat_limit', {
                                    limit: memberLimitLabel(activePlan, t),
                                })}
                            </p>
                            <p className="text-sm text-fg-muted">
                                {t('pages.settings.plan.add_seat_stub')}
                            </p>
                            <Button type="button" variant="secondary" disabled>
                                {t('pages.settings.plan.add_seat_cta')}
                            </Button>
                        </div>
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
                                <FormField
                                    control={inviteForm.control}
                                    name="role"
                                    render={({ field }) => (
                                        <FormItem>
                                            <Field
                                                label={t(
                                                    'pages.settings.panels.household.invite_role'
                                                )}>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {canInviteViewer ? (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                field.onChange(HouseholdRole.VIEWER)
                                                            }
                                                            className={cn(
                                                                'rounded-[10px] border px-3 py-2 text-xs font-medium transition-colors',
                                                                field.value === HouseholdRole.VIEWER
                                                                    ? 'border-accent bg-accent-soft text-accent'
                                                                    : 'border-line text-fg hover:border-accent/50'
                                                            )}>
                                                            {t(
                                                                'pages.settings.panels.household.invite_role_viewer'
                                                            )}
                                                        </button>
                                                    ) : null}
                                                    {canInviteMember ? (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                field.onChange(HouseholdRole.MEMBER)
                                                            }
                                                            className={cn(
                                                                'rounded-[10px] border px-3 py-2 text-xs font-medium transition-colors',
                                                                field.value === HouseholdRole.MEMBER
                                                                    ? 'border-accent bg-accent-soft text-accent'
                                                                    : 'border-line text-fg hover:border-accent/50'
                                                            )}>
                                                            {t(
                                                                'pages.settings.panels.household.invite_role_member'
                                                            )}
                                                        </button>
                                                    ) : null}
                                                    {canInviteAdmin ? (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                field.onChange(HouseholdRole.ADMIN)
                                                            }
                                                            className={cn(
                                                                'rounded-[10px] border px-3 py-2 text-xs font-medium transition-colors',
                                                                field.value === HouseholdRole.ADMIN
                                                                    ? 'border-accent bg-accent-soft text-accent'
                                                                    : 'border-line text-fg hover:border-accent/50'
                                                            )}>
                                                            {t(
                                                                'pages.settings.panels.household.invite_role_admin'
                                                            )}
                                                        </button>
                                                    ) : null}
                                                </div>
                                            </Field>
                                            {activePlan === PlanKey.BASIC ? (
                                                <p className="text-xs text-fg-muted">
                                                    {t(
                                                        'pages.settings.panels.household.invite_viewer_hint'
                                                    )}
                                                </p>
                                            ) : null}
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
        </SettingsPanel>
    );
}
