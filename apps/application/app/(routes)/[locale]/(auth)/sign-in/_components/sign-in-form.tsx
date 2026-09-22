'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { useRouter, useSearchParams } from 'next/navigation';

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
    Password,
    bindFormSubmit,
    createFormInvalidHandler,
} from '@rumtelo/ui';
import { useTranslations } from '@rumtelo/i18n';
import type { z } from 'zod';

import { zodResolver } from '@hookform/resolvers/zod';

import { useApiErrorFallbacks, useApiErrorMessage } from '@/app/_lib/api-error-messages';
import { useAuthFormSchemas } from '@/app/_lib/auth-form-schemas';
import {
    sendVerificationEmail,
    signIn,
    webForgotPasswordUrl,
    webOrigin,
    webSignUpUrl,
    webVerifyUrl,
} from '@/app/_lib/auth';
import { DEMO_ACCOUNTS } from '@rumtelo/contracts/platform';

function safeRedirectPath(value: string | null): string {
    if (value && value.startsWith('/') && !value.startsWith('//')) return value;
    return '/';
}

const isDev = process.env.NODE_ENV !== 'production';
const RESEND_COOLDOWN_SEC = 60;

export function SignInForm() {
    const t = useTranslations();
    const { signIn: signInSchema } = useAuthFormSchemas();
    type SignInValues = z.infer<typeof signInSchema>;
    const errorMessages = useApiErrorFallbacks();
    const formatApiMessage = useApiErrorMessage();
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectTo = safeRedirectPath(searchParams.get('redirectTo'));
    const [apiError, setApiError] = useState<unknown>(null);
    const [verification, setVerification] = useState<{
        email: string;
        sent: boolean;
    } | null>(null);
    const [resendPending, setResendPending] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    const form = useForm<SignInValues>({
        defaultValues: { email: '', password: '' },
        mode: 'onTouched',
        resolver: zodResolver(signInSchema),
    });

    const onInvalid = createFormInvalidHandler(undefined, {
        title: t('ui.form.incomplete_title'),
        description: t('ui.form.incomplete_description'),
    });

    useEffect(() => {
        if (cooldown <= 0) return;
        const id = window.setTimeout(() => setCooldown(left => left - 1), 1000);
        return () => window.clearTimeout(id);
    }, [cooldown]);

    async function submitCredentials(values: SignInValues) {
        setApiError(null);
        setVerification(null);

        const result = await signIn.email({
            email: values.email,
            password: values.password,
            callbackURL: redirectTo,
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

            if (code === 'EMAIL_NOT_VERIFIED' || code === 'EMAIL_VERIFICATION_REQUIRED') {
                setVerification({ email: values.email, sent: false });
                form.setValue('password', '');
                return;
            }

            const raw = result.error.message?.trim() ?? '';
            setApiError(
                raw || code
                    ? formatApiMessage(raw, code || undefined)
                    : t('features.auth.notifications.login_failure')
            );
            return;
        }

        router.push(redirectTo);
        router.refresh();
    }

    async function onResendVerification() {
        if (!verification?.email || resendPending || cooldown > 0) return;
        setResendPending(true);
        setApiError(null);
        const result = await sendVerificationEmail({
            email: verification.email,
            callbackURL: `${webOrigin()}/verify?status=confirmed`,
        });
        setResendPending(false);

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
                    : t('common.message.error.resend_failed')
            );
            return;
        }

        setVerification(prev => (prev ? { ...prev, sent: true } : prev));
        setCooldown(RESEND_COOLDOWN_SEC);
    }

    const busy = form.formState.isSubmitting;

    return (
        <div className="grid gap-6">
            <div>
                <Typography as="h1">{t('features.auth.sign_in.title')}</Typography>
                <Typography as="p" size="sm" color="muted" className="mt-1">
                    {t('features.auth.sign_in.subtitle')}
                </Typography>
            </div>

            {verification ? (
                <div
                    className="grid gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4"
                    role="status">
                    <Typography as="h4" weight="semibold" className="text-sm">
                        {t('features.auth.sign_in.verification.title')}
                    </Typography>
                    <Typography as="p" size="sm" color="secondary">
                        {verification.sent
                            ? t('features.auth.sign_in.verification.sent', {
                                  email: verification.email,
                              })
                            : t('features.auth.sign_in.verification.required', {
                                  email: verification.email,
                              })}
                    </Typography>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={resendPending || cooldown > 0}
                            onClick={() => void onResendVerification()}>
                            {cooldown > 0
                                ? t('features.auth.sign_in.verification.resend_in', {
                                      seconds: cooldown,
                                  })
                                : t('features.auth.sign_in.verification.resend')}
                        </Button>
                        <Button
                            as="a"
                            href={webVerifyUrl(verification.email)}
                            size="sm"
                            variant="secondary">
                            {t('features.auth.sign_in.verification.open_verify')}
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setVerification(null)}>
                            {t('features.auth.sign_in.verification.dismiss')}
                        </Button>
                    </div>
                </div>
            ) : null}

            {isDev ? (
                <div className="grid gap-2 rounded-xl border border-line bg-raised/40 p-3">
                    <p className="font-mono text-[10px] tracking-widest text-fg-faint uppercase">
                        {t('features.auth.sign_in.demo.heading')}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {DEMO_ACCOUNTS.map(account => (
                            <Button
                                key={account.persona}
                                type="button"
                                variant="secondary"
                                size="sm"
                                disabled={busy}
                                className="rounded-full font-mono text-[10px] tracking-wide uppercase"
                                onClick={() => {
                                    form.setValue('email', account.email, {
                                        shouldValidate: true,
                                        shouldDirty: true,
                                    });
                                    form.setValue('password', account.password, {
                                        shouldValidate: true,
                                        shouldDirty: true,
                                    });
                                    void form.handleSubmit(submitCredentials, onInvalid)();
                                }}>
                                {account.label}
                            </Button>
                        ))}
                    </div>
                    <Typography as="p" variant="caption" color="muted">
                        {t('features.auth.sign_in.demo.passwords')}{' '}
                        {DEMO_ACCOUNTS.map((account, index) => (
                            <span key={account.persona}>
                                {index > 0 ? ' / ' : null}
                                <code className="text-fg">{account.password}</code>
                            </span>
                        ))}
                    </Typography>
                </div>
            ) : null}

            <Form {...form}>
                <form
                    className="grid gap-4"
                    method="post"
                    onSubmit={bindFormSubmit(form, submitCredentials, onInvalid)}>
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

                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('ui.form.fields.password')}</FormLabel>
                                <FormControl>
                                    <Password
                                        autoComplete="current-password"
                                        placeholder={t('ui.form.fields.password_mask')}
                                        disabled={busy}
                                        showToggle
                                        showPasswordLabel={t('ui.form.show_password')}
                                        hidePasswordLabel={t('ui.form.hide_password')}
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="flex justify-end">
                        <a
                            href={webForgotPasswordUrl()}
                            className="text-sm font-medium text-accent hover:underline">
                            {t('features.auth.sign_in.forgot_password')}
                        </a>
                    </div>

                    <Button
                        type="submit"
                        className="mt-1 w-full"
                        disabled={busy}
                        data-testid="sign-in-submit">
                        {busy ? t('ui.form.working') : t('features.auth.sign_in.submit')}
                    </Button>
                </form>
            </Form>

            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-line" />
                </div>
                <div className="relative flex justify-center">
                    <span className="bg-bg px-3 text-xs text-fg-faint">
                        {t('features.auth.sign_in.or_divider')}
                    </span>
                </div>
            </div>

            <Typography as="p" size="sm" color="muted" className="text-center">
                {t('features.auth.sign_in.no_account')}{' '}
                <a href={webSignUpUrl()} className="font-semibold text-accent hover:underline">
                    {t('features.auth.sign_in.create_account')}
                </a>
            </Typography>
        </div>
    );
}
