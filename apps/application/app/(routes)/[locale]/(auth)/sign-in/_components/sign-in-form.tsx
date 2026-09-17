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
    Input,
    bindFormSubmit,
    createFormInvalidHandler,
} from '@rumtelo/ui';
import { AUTH_SIGN_IN } from '@rumtelo/i18n';
import { SignInForm as SignInFormSchema } from '@rumtelo/contracts';

import { zodResolver } from '@hookform/resolvers/zod';

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

function withEmail(template: string, email: string): string {
    return template.replaceAll('{email}', email);
}

const isDev = process.env.NODE_ENV !== 'production';
const RESEND_COOLDOWN_SEC = 60;

export function SignInForm() {
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

    const form = useForm<SignInFormSchema>({
        defaultValues: { email: '', password: '' },
        mode: 'onTouched',
        resolver: zodResolver(SignInFormSchema),
    });

    const onInvalid = createFormInvalidHandler();

    useEffect(() => {
        if (cooldown <= 0) return;
        const id = window.setTimeout(() => setCooldown(left => left - 1), 1000);
        return () => window.clearTimeout(id);
    }, [cooldown]);

    async function submitCredentials(values: SignInFormSchema) {
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

            setApiError(result.error.message ?? 'Sign in failed');
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
            setApiError(result.error.message ?? 'Could not resend');
            return;
        }

        setVerification(prev => (prev ? { ...prev, sent: true } : prev));
        setCooldown(RESEND_COOLDOWN_SEC);
    }

    const busy = form.formState.isSubmitting;

    return (
        <div className="grid gap-6">
            <div>
                <Typography as="h1">{AUTH_SIGN_IN.title}</Typography>
                <Typography as="p" size="sm" color="muted" className="mt-1">
                    {AUTH_SIGN_IN.subtitle}
                </Typography>
            </div>

            {verification ? (
                <div
                    className="grid gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4"
                    role="status">
                    <p className="font-display text-sm font-semibold text-fg">
                        {AUTH_SIGN_IN.verification.title}
                    </p>
                    <p className="text-sm text-fg-secondary">
                        {verification.sent
                            ? withEmail(AUTH_SIGN_IN.verification.sent, verification.email)
                            : withEmail(AUTH_SIGN_IN.verification.required, verification.email)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={resendPending || cooldown > 0}
                            onClick={() => void onResendVerification()}>
                            {cooldown > 0
                                ? AUTH_SIGN_IN.verification.resend_in.replaceAll(
                                      '{seconds}',
                                      String(cooldown)
                                  )
                                : AUTH_SIGN_IN.verification.resend}
                        </Button>
                        <Button
                            as="a"
                            href={webVerifyUrl(verification.email)}
                            size="sm"
                            variant="secondary">
                            {AUTH_SIGN_IN.verification.open_verify}
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setVerification(null)}>
                            {AUTH_SIGN_IN.verification.dismiss}
                        </Button>
                    </div>
                </div>
            ) : null}

            {isDev ? (
                <div className="grid gap-2 rounded-xl border border-line bg-raised/40 p-3">
                    <p className="font-mono text-[10px] tracking-widest text-fg-faint uppercase">
                        Demo accounts
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
                    <p className="text-xs text-fg-muted">
                        Passwords:{' '}
                        {DEMO_ACCOUNTS.map((account, index) => (
                            <span key={account.persona}>
                                {index > 0 ? ' / ' : null}
                                <code className="text-fg">{account.password}</code>
                            </span>
                        ))}
                    </p>
                </div>
            ) : null}

            <Form {...form}>
                <form
                    className="grid gap-4"
                    method="post"
                    onSubmit={bindFormSubmit(form, submitCredentials, onInvalid)}>
                    <FormErrorBox apiError={apiError} form={form} />

                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                    <Input
                                        type="email"
                                        autoComplete="email"
                                        placeholder="you@example.com"
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
                                <FormLabel>Password</FormLabel>
                                <FormControl>
                                    <Input
                                        type="password"
                                        autoComplete="current-password"
                                        placeholder="••••••••••••"
                                        disabled={busy}
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
                            {AUTH_SIGN_IN.forgot_password}
                        </a>
                    </div>

                    <Button type="submit" className="mt-1 w-full" disabled={busy}>
                        {busy ? 'Working…' : 'Sign in'}
                    </Button>
                </form>
            </Form>

            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-line" />
                </div>
                <div className="relative flex justify-center">
                    <span className="bg-bg px-3 text-xs text-fg-faint">or</span>
                </div>
            </div>

            <p className="text-center text-sm text-fg-muted">
                No account yet?{' '}
                <a href={webSignUpUrl()} className="font-semibold text-accent hover:underline">
                    {AUTH_SIGN_IN.create_account}
                </a>
            </p>
        </div>
    );
}
