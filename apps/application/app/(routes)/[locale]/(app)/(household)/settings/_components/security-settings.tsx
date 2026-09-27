'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from '@rumtelo/i18n';
import {
    Button,
    Field,
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
    Password,
} from '@rumtelo/ui';
import { useForm } from 'react-hook-form';

import { changePassword } from '@/app/_lib/auth';

import { createPasswordFormSchema, type PasswordFormValues } from '../_utils/settings-form-zod';
import { useSettingsMutation } from '../_utils/use-settings-mutation';
import {
    SettingsInkCard,
    SettingsPanel,
    SettingsPill,
    SettingsRow,
    SettingsRowLabel,
} from './settings-chrome';

/** Password and sign-in — `/settings/general/security`. */
export function SecuritySettings() {
    const t = useTranslations();
    const passwordForm = useForm<PasswordFormValues>({
        defaultValues: { currentPassword: '', newPassword: '' },
        resolver: zodResolver(createPasswordFormSchema(t)),
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

    return (
        <SettingsPanel>
            <SettingsInkCard
                eyebrow={t('pages.settings.panels.password.eyebrow')}
                blurb={t('pages.settings.panels.password.blurb')}>
                <SettingsRow>
                    <SettingsRowLabel
                        title={t('pages.settings.rows.sign_in_method.title')}
                        sub={t('pages.settings.rows.sign_in_method.sub')}
                    />
                    <SettingsPill tone="accent">
                        {t('pages.settings.rows.sign_in_method.connected')}
                    </SettingsPill>
                </SettingsRow>

                <SettingsRow last>
                    <SettingsRowLabel
                        title={t('pages.settings.rows.two_factor.title')}
                        sub={t('pages.settings.rows.two_factor.sub')}
                    />
                    <SettingsPill tone="neutral">
                        {t('pages.settings.rows.two_factor.off')}
                    </SettingsPill>
                </SettingsRow>

                <Form {...passwordForm}>
                    <form
                        className="grid gap-3 border-t border-line py-2.5"
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
        </SettingsPanel>
    );
}
