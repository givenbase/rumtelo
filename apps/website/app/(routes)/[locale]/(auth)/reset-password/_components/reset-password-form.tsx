'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import {
    Button,
    Typography,
    Form,
    FormControl,
    FormErrorBox,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    Password,
    bindFormSubmit,
    createFormInvalidHandler,
} from '@rumtelo/ui';
import { useTranslations } from '@rumtelo/i18n';
import { AUTH_MIN_PASSWORD_LENGTH } from '@rumtelo/contracts';
import type { ResetPasswordForm as ResetPasswordFormSchema } from '@rumtelo/contracts';

import { zodResolver } from '@hookform/resolvers/zod';

import { useAuthFormSchemas } from '@/app/_lib/auth-form-schemas';
import { useApiErrorFallbacks, useApiErrorMessage } from '@/app/_lib/api-error-messages';
import { resetPassword } from '@/lib/auth';
import { appSignInUrl } from '@/lib/portal-urls';

export function ResetPasswordForm() {
    const t = useTranslations();
    const schemas = useAuthFormSchemas();
    const errorMessages = useApiErrorFallbacks();
    const formatApiMessage = useApiErrorMessage();
    const searchParams = useSearchParams();
    const token = useMemo(() => searchParams.get('token')?.trim() ?? '', [searchParams]);
    const tokenError = searchParams.get('error');

    const [apiError, setApiError] = useState<unknown>(null);
    const [done, setDone] = useState(false);

    const form = useForm<ResetPasswordFormSchema>({
        defaultValues: { password: '', confirm: '' },
        mode: 'onTouched',
        resolver: zodResolver(schemas.resetPassword),
    });

    const onError = createFormInvalidHandler(undefined, {
        title: t('ui.form.incomplete_title'),
        description: t('ui.form.incomplete_description'),
    });

    async function onSubmit(values: ResetPasswordFormSchema) {
        if (!token) {
            setApiError(t('features.auth.reset_password.invalid'));
            return;
        }

        setApiError(null);
        const result = await resetPassword({
            newPassword: values.password,
            token,
        });

        if (result.error) {
            const errorCode =
                typeof result.error === 'object' && result.error && 'code' in result.error
                    ? (result.error as { code?: unknown }).code
                    : undefined;
            const code =
                typeof errorCode === 'string' || typeof errorCode === 'number'
                    ? String(errorCode)
                    : '';
            const raw = result.error.message?.trim() ?? '';
            setApiError(
                raw || code
                    ? formatApiMessage(raw, code || undefined)
                    : t('common.message.error.update_failed')
            );
            return;
        }

        setDone(true);
    }

    const busy = form.formState.isSubmitting;
    const invalidToken = Boolean(tokenError) || (!token && !done);

    return (
        <div className="grid gap-6">
            <div>
                <Typography as="h1" className="text-2xl lg:text-2xl">
                    {t('features.auth.reset_password.title')}
                </Typography>
                <Typography as="p" size="sm" color="muted" className="mt-1">
                    {invalidToken
                        ? t('features.auth.reset_password.invalid')
                        : t('features.auth.reset_password.subtitle')}
                </Typography>
            </div>

            {done ? (
                <>
                    <p className="text-sm text-fg-secondary">
                        {t('features.auth.reset_password.success')}
                    </p>
                    <Button as="a" href={appSignInUrl()} className="w-full">
                        {t('features.auth.reset_password.continue')}
                    </Button>
                </>
            ) : invalidToken ? (
                <Button as={Link} href="/forgot-password" className="w-full">
                    {t('features.auth.reset_password.request_again')}
                </Button>
            ) : (
                <Form {...form}>
                    <form
                        className="grid gap-4"
                        method="post"
                        onSubmit={bindFormSubmit(form, onSubmit, onError)}>
                        <FormErrorBox
                            apiError={apiError}
                            errorMessages={errorMessages}
                            resolveUserMessage={formatApiMessage}
                            form={form}
                            title={t('ui.form.incomplete_title')}
                            description={t('ui.form.incomplete_description_highlighted')}
                            fieldLabels={{
                                api: t('ui.form.fields.api'),
                                root: t('ui.form.fields.api'),
                                email: t('ui.form.fields.email'),
                                password: t('ui.form.fields.password'),
                                firstName: t('ui.form.fields.first_name'),
                                lastName: t('ui.form.fields.last_name'),
                                phone: t('ui.form.fields.phone'),
                                name: t('ui.form.fields.name'),
                                amount: t('ui.form.fields.amount'),
                                note: t('ui.form.fields.note'),
                                date: t('ui.form.fields.date'),
                                confirmPassword: t('ui.form.fields.confirm_password'),
                                newPassword: t('ui.form.fields.new_password'),
                            }}
                        />
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('ui.form.fields.new_password')}</FormLabel>
                                    <FormControl>
                                        <Password
                                            autoComplete="new-password"
                                            placeholder={t('features.auth.sign_up.password_hint', {
                                                count: AUTH_MIN_PASSWORD_LENGTH,
                                            })}
                                            disabled={busy}
                                            showPasswordLabel={t('ui.form.show_password')}
                                            hidePasswordLabel={t('ui.form.hide_password')}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="confirm"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('ui.form.fields.confirm_password')}</FormLabel>
                                    <FormControl>
                                        <Password
                                            autoComplete="new-password"
                                            disabled={busy}
                                            showPasswordLabel={t('ui.form.show_password')}
                                            hidePasswordLabel={t('ui.form.hide_password')}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" className="mt-1 w-full" disabled={busy}>
                            {busy ? t('ui.form.working') : t('features.auth.reset_password.submit')}
                        </Button>
                    </form>
                </Form>
            )}
        </div>
    );
}
