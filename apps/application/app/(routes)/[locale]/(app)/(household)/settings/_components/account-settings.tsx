'use client';

import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';
import { signOut } from '@/app/_lib/auth';
import { forceClearPracticePreview } from '@/app/_lib/practice-preview';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations } from '@rumtelo/i18n';
import {
    Icon,
    Button,
    DangerZone,
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
    Input,
    Phone,
} from '@rumtelo/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { SettingsInkCard, SettingsPanel, SettingsRow, SettingsRowLabel } from './settings-chrome';
import { FormDatePicker } from '@/components/features/forms/form-date-picker';
import { createProfileFormSchema, type ProfileFormValues } from '../_utils/settings-form-zod';
import { initials } from '../_utils/settings-shared';
import { useSettingsMutation } from '../_utils/use-settings-mutation';

/** Profile, sign-out, delete — `/settings`. */
export function AccountSettings() {
    const t = useTranslations();
    const router = useRouter();
    const { session, refreshSession } = useAuth();
    const { showToast } = useHouseholdShell();
    const user = session?.user;
    const profileQuery = useLiveQuery(apiQuery.account.profile.queryOptions(), null, Boolean(user));
    const [editingName, setEditingName] = useState(false);
    const [signingOut, setSigningOut] = useState(false);

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
    const displayNameDraft = useWatch({ control: profileForm.control, name: 'displayName' });

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

    async function handleSignOut() {
        setSigningOut(true);
        try {
            forceClearPracticePreview();
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
                                        saveProfile.isPending || !(displayNameDraft ?? '').trim()
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
                                        <FormDatePicker
                                            value={field.value}
                                            onChange={field.onChange}
                                            onBlur={field.onBlur}
                                            name={field.name}
                                            aria-label={t(
                                                'pages.settings.panels.profile.date_of_birth'
                                            )}
                                        />
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

            <DangerZone
                title={t('pages.settings.account.delete_account')}
                body={t('pages.settings.delete.body')}
                action={t('pages.settings.account.delete_account')}
                onAction={() => showToast(t('pages.settings.toasts.delete_coming'), 'info')}
            />
        </SettingsPanel>
    );
}
