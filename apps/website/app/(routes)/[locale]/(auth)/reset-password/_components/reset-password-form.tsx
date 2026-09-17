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
    Input,
    bindFormSubmit,
    createFormInvalidHandler,
} from '@rumtelo/ui';
import { AUTH_RESET_PASSWORD } from '@rumtelo/i18n';
import {
    AUTH_MIN_PASSWORD_LENGTH,
    ResetPasswordForm as ResetPasswordFormSchema,
} from '@rumtelo/contracts';

import { zodResolver } from '@hookform/resolvers/zod';

import { resetPassword } from '@/lib/auth';
import { appSignInUrl } from '@/lib/portal-urls';

export function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const token = useMemo(() => searchParams.get('token')?.trim() ?? '', [searchParams]);
    const tokenError = searchParams.get('error');

    const [apiError, setApiError] = useState<unknown>(null);
    const [done, setDone] = useState(false);

    const form = useForm<ResetPasswordFormSchema>({
        defaultValues: { password: '', confirm: '' },
        mode: 'onTouched',
        resolver: zodResolver(ResetPasswordFormSchema),
    });

    const onError = createFormInvalidHandler();

    async function onSubmit(values: ResetPasswordFormSchema) {
        if (!token) {
            setApiError('This reset link is invalid or incomplete.');
            return;
        }

        setApiError(null);
        const result = await resetPassword({
            newPassword: values.password,
            token,
        });

        if (result.error) {
            setApiError(result.error.message ?? 'Could not reset password');
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
                    {AUTH_RESET_PASSWORD.title}
                </Typography>
                <p className="mt-1 text-sm text-fg-muted">
                    {invalidToken ? AUTH_RESET_PASSWORD.invalid : AUTH_RESET_PASSWORD.subtitle}
                </p>
            </div>

            {done ? (
                <>
                    <p className="text-sm text-fg-secondary">{AUTH_RESET_PASSWORD.success}</p>
                    <Button as="a" href={appSignInUrl()} className="w-full">
                        {AUTH_RESET_PASSWORD.continue}
                    </Button>
                </>
            ) : invalidToken ? (
                <Button as={Link} href="/forgot-password" className="w-full">
                    {AUTH_RESET_PASSWORD.request_again}
                </Button>
            ) : (
                <Form {...form}>
                    <form
                        className="grid gap-4"
                        method="post"
                        onSubmit={bindFormSubmit(form, onSubmit, onError)}>
                        <FormErrorBox apiError={apiError} form={form} />
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>New password</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="password"
                                            autoComplete="new-password"
                                            placeholder={`At least ${AUTH_MIN_PASSWORD_LENGTH} characters`}
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
                            name="confirm"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Confirm password</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="password"
                                            autoComplete="new-password"
                                            disabled={busy}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" className="mt-1 w-full" disabled={busy}>
                            {busy ? 'Working…' : AUTH_RESET_PASSWORD.submit}
                        </Button>
                    </form>
                </Form>
            )}
        </div>
    );
}
