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
    Input,
    bindFormSubmit,
    createFormInvalidHandler,
} from '@rumtelo/ui';
import { AUTH_FORGOT_PASSWORD } from '@rumtelo/i18n';
import { ForgotPasswordForm as ForgotPasswordFormSchema } from '@rumtelo/contracts';

import { zodResolver } from '@hookform/resolvers/zod';

import { requestPasswordReset } from '@/lib/auth';
import { appSignInUrl, webOrigin } from '@/lib/portal-urls';

export function ForgotPasswordForm() {
    const [apiError, setApiError] = useState<unknown>(null);
    const [sent, setSent] = useState(false);

    const form = useForm<ForgotPasswordFormSchema>({
        defaultValues: { email: '' },
        mode: 'onTouched',
        resolver: zodResolver(ForgotPasswordFormSchema),
    });

    const onError = createFormInvalidHandler();

    async function onSubmit(values: ForgotPasswordFormSchema) {
        setApiError(null);
        const result = await requestPasswordReset({
            email: values.email,
            redirectTo: `${webOrigin()}/reset-password`,
        });

        if (result.error) {
            setApiError(result.error.message ?? 'Could not send reset email');
            return;
        }

        setSent(true);
    }

    const busy = form.formState.isSubmitting;

    return (
        <div className="grid gap-6">
            <div>
                <Typography as="h1" className="text-2xl lg:text-2xl">
                    {AUTH_FORGOT_PASSWORD.title}
                </Typography>
                <p className="mt-1 text-sm text-fg-muted">{AUTH_FORGOT_PASSWORD.subtitle}</p>
            </div>

            {sent ? (
                <p className="text-sm text-fg-secondary">{AUTH_FORGOT_PASSWORD.sent}</p>
            ) : (
                <Form {...form}>
                    <form
                        className="grid gap-4"
                        method="post"
                        onSubmit={bindFormSubmit(form, onSubmit, onError)}>
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
                        <Button type="submit" className="mt-1 w-full" disabled={busy}>
                            {busy ? 'Working…' : AUTH_FORGOT_PASSWORD.submit}
                        </Button>
                    </form>
                </Form>
            )}

            <p className="text-center text-sm text-fg-muted">
                <a href={appSignInUrl()} className="font-semibold text-accent hover:underline">
                    {AUTH_FORGOT_PASSWORD.back_to_sign_in}
                </a>
                {' · '}
                <Link href="/sign-up" className="font-semibold text-accent hover:underline">
                    {AUTH_FORGOT_PASSWORD.back_to_sign_up}
                </Link>
            </p>
        </div>
    );
}
