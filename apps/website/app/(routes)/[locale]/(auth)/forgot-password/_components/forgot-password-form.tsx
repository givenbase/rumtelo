'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';

import Link from 'next/link';

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
    Email,
    bindFormSubmit,
    createFormInvalidHandler,
} from '@rumtelo/ui';
import { useTranslations } from '@rumtelo/i18n';
import type { ForgotPasswordForm as ForgotPasswordFormSchema } from '@rumtelo/contracts';

import { zodResolver } from '@hookform/resolvers/zod';

import { useAuthFormSchemas } from '@/app/_lib/auth-form-schemas';
import { useApiErrorFallbacks, useApiErrorMessage } from '@/app/_lib/api-error-messages';
import { requestPasswordReset } from '@/lib/auth';
import { isRegistrationOpen } from '@/lib/maintenance';
import { appSignInUrl, webOrigin } from '@/lib/portal-urls';

export function ForgotPasswordForm() {
    const t = useTranslations();
    const schemas = useAuthFormSchemas();
    const errorMessages = useApiErrorFallbacks();
    const formatApiMessage = useApiErrorMessage();
    const [apiError, setApiError] = useState<unknown>(null);
    const [sent, setSent] = useState(false);

    const form = useForm<ForgotPasswordFormSchema>({
        defaultValues: { email: '' },
        mode: 'onTouched',
        resolver: zodResolver(schemas.forgotPassword),
    });

    const onError = createFormInvalidHandler(undefined, {
        title: t('ui.form.incomplete_title'),
        description: t('ui.form.incomplete_description'),
    });

    async function onSubmit(values: ForgotPasswordFormSchema) {
        setApiError(null);
        const result = await requestPasswordReset({
            email: values.email,
            redirectTo: `${webOrigin()}/reset-password`,
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
                    : t('common.message.error.send_failed')
            );
            return;
        }

        setSent(true);
    }

    const busy = form.formState.isSubmitting;

    return (
        <div className="grid gap-6">
            <div>
                <Typography as="h1" className="text-2xl lg:text-2xl">
                    {t('features.auth.forgot_password.title')}
                </Typography>
                <Typography as="p" size="sm" color="muted" className="mt-1">
                    {t('features.auth.forgot_password.subtitle')}
                </Typography>
            </div>

            {sent ? (
                <p className="text-sm text-fg-secondary">
                    {t('features.auth.forgot_password.sent')}
                </p>
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
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('ui.form.fields.email')}</FormLabel>
                                    <FormControl>
                                        <Email
                                            placeholder={t('ui.form.fields.email_placeholder')}
                                            disabled={busy}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" className="mt-1 w-full" disabled={busy}>
                            {busy
                                ? t('ui.form.working')
                                : t('features.auth.forgot_password.submit')}
                        </Button>
                    </form>
                </Form>
            )}

            <Typography as="p" size="sm" color="muted" className="text-center">
                <a href={appSignInUrl()} className="font-semibold text-accent hover:underline">
                    {t('features.auth.forgot_password.back_to_sign_in')}
                </a>
                {isRegistrationOpen() ? (
                    <>
                        {' · '}
                        <Link href="/sign-up" className="font-semibold text-accent hover:underline">
                            {t('features.auth.forgot_password.back_to_sign_up')}
                        </Link>
                    </>
                ) : null}
            </Typography>
        </div>
    );
}
