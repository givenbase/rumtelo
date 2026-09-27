'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';

import {
    HouseholdRole,
    PlanKey,
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
import { SettingsInkCard } from './settings-chrome';

/** Household members + invite — own settings page (`/settings/general/household`). */
export function HouseholdMembersSettings() {
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
    const billingStatusQuery = useLiveQuery(
        apiQuery.billing.status.queryOptions({ input: { householdId: householdId! } }),
        null,
        live
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

    return (
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
                                    <p className="truncate text-xs text-fg-muted">{member.email}</p>
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
    );
}
