'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { useRouter } from 'next/navigation';

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
import {
    AUTH_MIN_PASSWORD_LENGTH,
    SignUpForm as SignUpFormSchema,
    composeDisplayName,
} from '@rumtelo/contracts';
import { AUTH_SIGN_UP } from '@rumtelo/i18n';

import { zodResolver } from '@hookform/resolvers/zod';

import { planIntentQuery, type PendingPlanIntent } from '@rumtelo/utils';

import { signUp } from '@/lib/auth';
import { appSignInUrl } from '@/lib/portal-urls';
import { useOptionalPlanIntent } from '@/app/_components/plan-intent-provider';
import { useOptionalSignUpDraft } from '@/app/_components/sign-up-draft-provider';

const PLAN_LABELS = { PLUS: 'Plus', MAX: 'Max' } as const;

function verifyCallbackUrl(intent: PendingPlanIntent | null): string {
    const params = new URLSearchParams({ status: 'confirmed' });
    const planQuery = planIntentQuery(intent);
    for (const [key, value] of Object.entries(planQuery)) {
        params.set(key, value);
    }
    return `/verify?${params.toString()}`;
}

export function SignUpForm() {
    const router = useRouter();
    const planIntent = useOptionalPlanIntent();
    const signUpDraft = useOptionalSignUpDraft();
    const [apiError, setApiError] = useState<unknown>(null);

    const intent = planIntent?.intent ?? null;
    const draft = signUpDraft?.draft ?? null;

    const form = useForm<SignUpFormSchema>({
        defaultValues: {
            firstName: draft?.firstName ?? '',
            middleName: '',
            lastName: draft?.lastName ?? '',
            email: draft?.email ?? '',
            password: '',
            phone: '',
            dateOfBirth: '',
        },
        mode: 'onTouched',
        resolver: zodResolver(SignUpFormSchema),
    });

    useEffect(() => {
        if (!draft) return;
        const current = form.getValues();
        if (current.firstName || current.lastName || current.email) return;
        form.reset({
            ...current,
            firstName: draft.firstName,
            lastName: draft.lastName,
            email: draft.email,
        });
    }, [draft, form]);

    const onError = createFormInvalidHandler();

    async function onSubmit(values: SignUpFormSchema) {
        setApiError(null);

        const name = composeDisplayName(values.firstName, values.middleName, values.lastName);

        // Keep draft for verify (email) without putting PII in the URL.
        signUpDraft?.setDraft({
            firstName: values.firstName,
            lastName: values.lastName,
            email: values.email,
        });

        const result = await signUp.email({
            name,
            email: values.email,
            password: values.password,
            callbackURL: verifyCallbackUrl(intent),
            // Forwarded to Nest → stashed → `auth.account` (not Better Auth user columns).
            firstName: values.firstName,
            middleName: values.middleName || undefined,
            lastName: values.lastName,
            phone: values.phone || undefined,
            dateOfBirth: values.dateOfBirth || undefined,
        } as Parameters<typeof signUp.email>[0]);

        if (result.error) {
            form.setValue('password', '');
            setApiError(result.error.message ?? 'Registration failed');
            return;
        }

        const verifyQs = new URLSearchParams(planIntentQuery(intent)).toString();
        router.push(verifyQs ? `/verify?${verifyQs}` : '/verify');
        router.refresh();
    }

    const busy = form.formState.isSubmitting;

    return (
        <div className="grid gap-6">
            <div>
                <Typography as="h1">{AUTH_SIGN_UP.title}</Typography>
                <Typography as="p" size="sm" color="muted" className="mt-1">
                    {AUTH_SIGN_UP.subtitle}
                </Typography>
                {intent ? (
                    <p className="mt-3 rounded-lg border border-accent/35 bg-accent-soft/40 px-3 py-2 text-sm text-fg-secondary">
                        You chose{' '}
                        <span className="font-semibold text-fg">{PLAN_LABELS[intent.planKey]}</span>
                        {intent.interval === 'year' ? ' (yearly)' : ' (monthly)'}. After setup we’ll
                        take you to Stripe to add payment and finish the upgrade.
                    </p>
                ) : null}
            </div>

            <Form {...form}>
                <form
                    className="grid gap-4"
                    method="post"
                    onSubmit={bindFormSubmit(form, onSubmit, onError)}>
                    <FormErrorBox apiError={apiError} form={form} />

                    <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                            control={form.control}
                            name="firstName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>First name</FormLabel>
                                    <FormControl>
                                        <Input
                                            autoComplete="given-name"
                                            placeholder="Given"
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
                            name="lastName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Last name</FormLabel>
                                    <FormControl>
                                        <Input
                                            autoComplete="family-name"
                                            placeholder="Family"
                                            disabled={busy}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <FormField
                        control={form.control}
                        name="middleName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Middle name</FormLabel>
                                <FormControl>
                                    <Input
                                        autoComplete="additional-name"
                                        placeholder="Optional"
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

                    <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Phone</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="tel"
                                            autoComplete="tel"
                                            placeholder="Optional"
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
                            name="dateOfBirth"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Birthday</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="date"
                                            autoComplete="bday"
                                            disabled={busy}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <Button type="submit" className="mt-1 w-full" disabled={busy}>
                        {busy ? 'Working…' : 'Create account'}
                    </Button>
                </form>
            </Form>

            <Typography as="p" size="sm" color="muted" className="text-center">
                Already have an account?{' '}
                <a href={appSignInUrl()} className="font-semibold text-accent hover:underline">
                    Sign in
                </a>
            </Typography>
        </div>
    );
}
