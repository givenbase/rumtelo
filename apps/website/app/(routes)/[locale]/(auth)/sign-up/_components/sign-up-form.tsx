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
    Email,
    Phone,
    Password,
    bindFormSubmit,
    createFormInvalidHandler,
} from '@rumtelo/ui';
import { AUTH_MIN_PASSWORD_LENGTH, composeDisplayName } from '@rumtelo/contracts';
import type { SignUpForm as SignUpFormSchema } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';

import { zodResolver } from '@hookform/resolvers/zod';

import { planIntentQuery, type PendingPlanIntent } from '@rumtelo/utils';

import { useAuthFormSchemas } from '@/app/_lib/auth-form-schemas';
import { useApiErrorFallbacks, useApiErrorMessage } from '@/app/_lib/api-error-messages';
import { signUp } from '@/lib/auth';
import { planSlug } from '@/lib/landing-plans';
import { appSignInUrl } from '@/lib/portal-urls';
import { useOptionalPlanIntent } from '@/app/_components/plan-intent-provider';
import { useOptionalSignUpDraft } from '@/app/_components/sign-up-draft-provider';

function verifyCallbackUrl(intent: PendingPlanIntent | null): string {
    const params = new URLSearchParams({ status: 'confirmed' });
    const planQuery = planIntentQuery(intent);
    for (const [key, value] of Object.entries(planQuery)) {
        params.set(key, value);
    }
    return `/verify?${params.toString()}`;
}

export function SignUpForm() {
    const t = useTranslations();
    const tPlans = useTranslations('pages.landing.plans');
    const schemas = useAuthFormSchemas();
    const errorMessages = useApiErrorFallbacks();
    const formatApiMessage = useApiErrorMessage();
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
        resolver: zodResolver(schemas.signUp),
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

    const onError = createFormInvalidHandler(undefined, {
        title: t('ui.form.incomplete_title'),
        description: t('ui.form.incomplete_description'),
    });

    async function onSubmit(values: SignUpFormSchema) {
        setApiError(null);

        const name = composeDisplayName(values.firstName, values.middleName, values.lastName);

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
            firstName: values.firstName,
            middleName: values.middleName || undefined,
            lastName: values.lastName,
            phone: values.phone || undefined,
            dateOfBirth: values.dateOfBirth || undefined,
        } as Parameters<typeof signUp.email>[0]);

        if (result.error) {
            form.setValue('password', '');
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
                    : t('common.message.error.generic')
            );
            return;
        }

        const verifyParams = new URLSearchParams(planIntentQuery(intent));
        verifyParams.set('email', values.email);
        router.push(`/verify?${verifyParams.toString()}`);
        router.refresh();
    }

    const busy = form.formState.isSubmitting;

    return (
        <div className="grid gap-6">
            <div>
                <Typography as="h1">{t('features.auth.sign_up.title')}</Typography>
                <Typography as="p" size="sm" color="muted" className="mt-1">
                    {t('features.auth.sign_up.subtitle')}
                </Typography>
                {intent ? (
                    <p className="mt-3 rounded-lg border border-accent/35 bg-accent-soft/40 px-3 py-2 text-sm text-fg-secondary">
                        {t('features.auth.sign_up.plan_intent', {
                            plan: tPlans(`${planSlug(intent.planKey)}.name`),
                            interval:
                                intent.interval === 'year'
                                    ? t('features.auth.sign_up.plan_yearly')
                                    : t('features.auth.sign_up.plan_monthly'),
                        })}
                    </p>
                ) : null}
            </div>

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

                    <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                            control={form.control}
                            name="firstName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('ui.form.fields.first_name')}</FormLabel>
                                    <FormControl>
                                        <Input
                                            autoComplete="given-name"
                                            placeholder={t('ui.form.fields.first_name')}
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
                                    <FormLabel>{t('ui.form.fields.last_name')}</FormLabel>
                                    <FormControl>
                                        <Input
                                            autoComplete="family-name"
                                            placeholder={t('ui.form.fields.last_name')}
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
                                <FormLabel optional>
                                    {t('features.auth.sign_up.middle_name')}
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        autoComplete="additional-name"
                                        placeholder={t('ui.form.optional')}
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

                    <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel optional>{t('ui.form.fields.phone')}</FormLabel>
                                    <FormControl>
                                        <Phone
                                            autoComplete="tel"
                                            placeholder={t('ui.form.optional')}
                                            disabled={busy}
                                            value={field.value}
                                            onChange={field.onChange}
                                            onBlur={field.onBlur}
                                            name={field.name}
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
                                    <FormLabel optional>
                                        {t('features.auth.sign_up.birthday')}
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            type="date"
                                            autoComplete="bday"
                                            disabled={busy}
                                            pickerAriaLabel={t('ui.form.aria.open_date_picker')}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <Button type="submit" className="mt-1 w-full" disabled={busy}>
                        {busy ? t('ui.form.working') : t('features.auth.sign_up.submit')}
                    </Button>
                </form>
            </Form>

            <Typography as="p" size="sm" color="muted" className="text-center">
                {t('features.auth.sign_up.have_account')}{' '}
                <a href={appSignInUrl()} className="font-semibold text-accent hover:underline">
                    {t('ui.button.actions.sign_in')}
                </a>
            </Typography>
        </div>
    );
}
