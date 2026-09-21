'use client';

import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

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
    Email,
    bindFormSubmit,
    createFormInvalidHandler,
} from '@rumtelo/ui';
import { AUTH_VERIFY } from '@rumtelo/i18n';
import { VerifyEmailForm as VerifyEmailFormSchema } from '@rumtelo/contracts';

import { zodResolver } from '@hookform/resolvers/zod';

import { sendVerificationEmail } from '@/lib/auth';
import { appSignInAfterAuthUrl, appSignInUrl } from '@/lib/portal-urls';
import { useOptionalPlanIntent } from '@/app/_components/plan-intent-provider';
import { useOptionalSignUpDraft } from '@/app/_components/sign-up-draft-provider';
import { planIntentQuery } from '@rumtelo/utils';

const RESEND_COOLDOWN_SEC = 60;

function withEmail(template: string, email: string): string {
    return template.replaceAll('{email}', email);
}

export function VerifyPanel() {
    const searchParams = useSearchParams();
    const planIntent = useOptionalPlanIntent();
    const signUpDraft = useOptionalSignUpDraft();
    const emailFromDraft = signUpDraft?.draft?.email?.trim() ?? '';
    const emailFromQuery = searchParams.get('email')?.trim() ?? '';
    const emailDefault = emailFromDraft || emailFromQuery;
    const status = searchParams.get('status');
    const confirmed = status === 'confirmed' || status === 'ok';
    const continueQuery = {
        ...planIntentQuery(planIntent?.intent ?? null),
    };

    const [apiError, setApiError] = useState<unknown>(null);
    const [sent, setSent] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    const form = useForm<VerifyEmailFormSchema>({
        defaultValues: { email: emailDefault },
        mode: 'onTouched',
        resolver: zodResolver(VerifyEmailFormSchema),
    });

    const onInvalid = createFormInvalidHandler();

    useEffect(() => {
        if (emailDefault) {
            form.reset({ email: emailDefault });
        }
    }, [emailDefault, form]);

    useEffect(() => {
        if (cooldown <= 0) return;
        const id = window.setTimeout(() => setCooldown(left => left - 1), 1000);
        return () => window.clearTimeout(id);
    }, [cooldown]);

    async function onSubmit(values: VerifyEmailFormSchema) {
        if (cooldown > 0) return;
        setApiError(null);

        const result = await sendVerificationEmail({
            email: values.email,
            callbackURL: '/verify?status=confirmed',
        });

        if (result.error) {
            setApiError(result.error.message ?? 'Could not resend');
            return;
        }

        setSent(true);
        setCooldown(RESEND_COOLDOWN_SEC);
    }

    const busy = form.formState.isSubmitting;
    const watchedEmail = useWatch({ control: form.control, name: 'email' }) ?? '';
    const subtitle = confirmed
        ? AUTH_VERIFY.confirmed
        : watchedEmail.trim()
          ? withEmail(AUTH_VERIFY.subtitle, watchedEmail.trim())
          : AUTH_VERIFY.subtitle_no_target;

    return (
        <div className="grid gap-6">
            <div>
                <Typography as="h1" className="text-2xl lg:text-2xl">
                    {confirmed ? AUTH_VERIFY.confirmed_title : AUTH_VERIFY.title}
                </Typography>
                <Typography as="p" size="sm" color="muted" className="mt-1">
                    {subtitle}
                </Typography>
            </div>

            {confirmed ? (
                <Button
                    as="a"
                    href={appSignInAfterAuthUrl(continueQuery)}
                    className="w-full"
                    onClick={() => signUpDraft?.clearDraft()}>
                    {AUTH_VERIFY.continue}
                </Button>
            ) : (
                <Form {...form}>
                    <form
                        className="grid gap-4"
                        method="post"
                        onSubmit={bindFormSubmit(form, onSubmit, onInvalid)}>
                        <FormErrorBox apiError={apiError} form={form} />

                        {sent ? (
                            <p className="text-sm text-fg-secondary">{AUTH_VERIFY.sent}</p>
                        ) : null}

                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Email
                                            placeholder="you@example.com"
                                            autoComplete="email"
                                            readOnly={Boolean(emailDefault)}
                                            disabled={busy || cooldown > 0}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex flex-col gap-3 sm:flex-row">
                            <Button
                                type="submit"
                                variant="secondary"
                                disabled={busy || cooldown > 0}
                                className="sm:flex-1">
                                {cooldown > 0
                                    ? AUTH_VERIFY.resend_in.replaceAll(
                                          '{seconds}',
                                          String(cooldown)
                                      )
                                    : busy
                                      ? 'Working…'
                                      : AUTH_VERIFY.resend}
                            </Button>
                            <Button
                                as="a"
                                href={appSignInAfterAuthUrl(continueQuery)}
                                variant="secondary"
                                className="sm:flex-1">
                                {AUTH_VERIFY.continue}
                            </Button>
                        </div>
                    </form>
                </Form>
            )}

            <Typography as="p" size="sm" color="muted" className="text-center">
                <Link
                    href={`/sign-up${
                        Object.keys(continueQuery).length
                            ? `?${new URLSearchParams(continueQuery).toString()}`
                            : ''
                    }`}
                    className="font-semibold text-accent hover:underline">
                    {AUTH_VERIFY.back_to_sign_up}
                </Link>
                {' · '}
                <a
                    href={appSignInUrl(continueQuery)}
                    className="font-semibold text-accent hover:underline">
                    {AUTH_VERIFY.back_to_sign_in}
                </a>
            </Typography>
        </div>
    );
}
