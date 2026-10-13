'use client';

import { useEffect, useMemo, useState } from 'react';
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
    Email,
    Phone,
    Password,
    DatePicker,
    bindFormSubmit,
    createFormInvalidHandler,
} from '@rumtelo/ui';
import { AUTH_MIN_PASSWORD_LENGTH, composeDisplayName } from '@rumtelo/contracts';
import type { SignUpForm as SignUpFormSchema } from '@rumtelo/contracts';
import { useLocale, useTranslations } from '@rumtelo/i18n';

import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import {
    cn,
    householdInviteQuery,
    planIntentQuery,
    practiceInviteQuery,
    PRACTICE_NAME_MAX_LENGTH,
    SIGN_UP_AUDIENCES,
    signUpAudienceFromSearchParams,
    signUpAudienceQuery,
    type PendingPlanIntent,
    type SignUpAudience,
} from '@rumtelo/utils';

import { useAuthFormSchemas } from '@/app/_lib/auth-form-schemas';
import { useApiErrorFallbacks, useApiErrorMessage } from '@/app/_lib/api-error-messages';
import { signUp } from '@/lib/auth';
import { planSlug } from '@/lib/landing-plans';
import { appSignInUrl } from '@/lib/portal-urls';
import { useOptionalHouseholdInvite } from '@/app/_components/household-invite-provider';
import { useOptionalPlanIntent } from '@/app/_components/plan-intent-provider';
import { useOptionalPracticeInvite } from '@/app/_components/practice-invite-provider';
import { useOptionalSignUpDraft } from '@/app/_components/sign-up-draft-provider';

const AUDIENCE_COPY: Record<SignUpAudience, { label: string; hint: string }> = {
    individual: {
        label: 'features.auth.sign_up.audience_individual',
        hint: 'features.auth.sign_up.audience_individual_hint',
    },
    practice: {
        label: 'features.auth.sign_up.audience_practice',
        hint: 'features.auth.sign_up.audience_practice_hint',
    },
};

/** Practice sign-ups also name their practice — it prefills the create form after verify. */
type SignUpValues = SignUpFormSchema & { practiceName: string };

function verifyCallbackUrl(
    intent: PendingPlanIntent | null,
    practiceInviteToken: string | null,
    householdInviteId: string | null,
    audience: SignUpAudience,
    practiceName: string
): string {
    const params = new URLSearchParams({ status: 'confirmed' });
    for (const [key, value] of Object.entries(signUpAudienceQuery(audience, practiceName))) {
        params.set(key, value);
    }
    const planQuery = planIntentQuery(intent);
    for (const [key, value] of Object.entries(planQuery)) {
        params.set(key, value);
    }
    for (const [key, value] of Object.entries(practiceInviteQuery(practiceInviteToken))) {
        params.set(key, value);
    }
    for (const [key, value] of Object.entries(householdInviteQuery(householdInviteId))) {
        params.set(key, value);
    }
    return `/verify?${params.toString()}`;
}

export function SignUpForm() {
    const t = useTranslations();
    const tForm = useTranslations('ui.form');
    const locale = useLocale();
    const tPlans = useTranslations('pages.landing.plans');
    const schemas = useAuthFormSchemas();
    const errorMessages = useApiErrorFallbacks();
    const formatApiMessage = useApiErrorMessage();
    const router = useRouter();
    const searchParams = useSearchParams();
    const planIntent = useOptionalPlanIntent();
    const practiceInvite = useOptionalPracticeInvite();
    const householdInvite = useOptionalHouseholdInvite();
    const signUpDraft = useOptionalSignUpDraft();
    const [apiError, setApiError] = useState<unknown>(null);
    const [pickedAudience, setPickedAudience] = useState<SignUpAudience>(() =>
        signUpAudienceFromSearchParams(searchParams)
    );

    const practiceInviteToken = practiceInvite?.token ?? null;
    const householdInviteId = householdInvite?.invitationId ?? null;
    // Invitees join someone else's board — they always sign up as an individual.
    const joiningSomeone = Boolean(practiceInviteToken || householdInviteId);
    const audience: SignUpAudience = joiningSomeone ? 'individual' : pickedAudience;
    const forPractice = audience === 'practice';
    // A Plus/Max pick is a household plan; a practice pays on its own desk.
    const intent = forPractice ? null : (planIntent?.intent ?? null);
    const draft = signUpDraft?.draft ?? null;
    const emailFromInvite = searchParams.get('email')?.trim() ?? '';

    const signUpSchema = useMemo(
        () =>
            schemas.signUp.extend({
                practiceName: z.string().trim().max(PRACTICE_NAME_MAX_LENGTH),
            }),
        [schemas]
    );

    const form = useForm<SignUpValues>({
        defaultValues: {
            firstName: draft?.firstName ?? '',
            middleName: '',
            lastName: draft?.lastName ?? '',
            email: draft?.email || emailFromInvite || '',
            password: '',
            phone: '',
            dateOfBirth: '',
            practiceName: '',
        },
        mode: 'onTouched',
        resolver: zodResolver(signUpSchema),
    });

    useEffect(() => {
        if (!draft && !emailFromInvite) return;
        const current = form.getValues();
        if (current.firstName || current.lastName || current.email) return;
        form.reset({
            ...current,
            firstName: draft?.firstName ?? '',
            lastName: draft?.lastName ?? '',
            email: draft?.email || emailFromInvite || '',
        });
    }, [draft, emailFromInvite, form]);

    const onError = createFormInvalidHandler(undefined, {
        title: t('ui.form.incomplete_title'),
        description: t('ui.form.incomplete_description'),
    });

    async function onSubmit(values: SignUpValues) {
        setApiError(null);

        // Required only on the Practice path — checked here so one schema serves both paths.
        if (forPractice && !values.practiceName.trim()) {
            form.setError('practiceName', {
                message: t('features.auth.sign_up.practice_name_required'),
            });
            form.setFocus('practiceName');
            return;
        }

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
            callbackURL: verifyCallbackUrl(
                intent,
                practiceInviteToken,
                householdInviteId,
                audience,
                values.practiceName
            ),
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

        const verifyParams = new URLSearchParams({
            ...planIntentQuery(intent),
            ...practiceInviteQuery(practiceInviteToken),
            ...signUpAudienceQuery(audience, values.practiceName),
        });
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
                    {forPractice
                        ? t('features.auth.sign_up.subtitle_practice')
                        : t('features.auth.sign_up.subtitle')}
                </Typography>
                {intent ? (
                    <p className="mt-3 rounded-lg border border-accent bg-accent-soft/40 px-3 py-2 text-sm text-fg-secondary">
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

            {joiningSomeone ? null : (
                <fieldset className="grid gap-2">
                    <legend className="mb-2 font-mono text-[10px] font-semibold tracking-widest text-fg-faint uppercase">
                        {t('features.auth.sign_up.audience_label')}
                    </legend>
                    <div className="grid gap-2 sm:grid-cols-2">
                        {SIGN_UP_AUDIENCES.map(option => {
                            const active = audience === option;
                            return (
                                <label
                                    key={option}
                                    className={cn(
                                        'grid cursor-pointer gap-0.5 rounded-xl border px-3.5 py-3 transition-colors has-focus-visible:ring-2 has-focus-visible:ring-accent',
                                        active
                                            ? 'border-accent bg-accent-soft/40'
                                            : 'border-line hover:border-accent/50'
                                    )}>
                                    <input
                                        type="radio"
                                        name="audience"
                                        value={option}
                                        checked={active}
                                        onChange={() => setPickedAudience(option)}
                                        className="sr-only"
                                    />
                                    <span className="text-sm font-semibold text-fg">
                                        {t(AUDIENCE_COPY[option].label)}
                                    </span>
                                    <span className="text-xs text-fg-muted">
                                        {t(AUDIENCE_COPY[option].hint)}
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                    {forPractice ? (
                        <p className="text-xs text-fg-muted">
                            {t('features.auth.sign_up.practice_note')}
                        </p>
                    ) : null}
                </fieldset>
            )}

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
                            practiceName: t('features.auth.sign_up.practice_name_label'),
                            phone: t('ui.form.fields.phone'),
                            name: t('ui.form.fields.name'),
                            amount: t('ui.form.fields.amount'),
                            note: t('ui.form.fields.note'),
                            date: t('ui.form.fields.date'),
                            confirmPassword: t('ui.form.fields.confirm_password'),
                            newPassword: t('ui.form.fields.new_password'),
                        }}
                    />

                    {forPractice ? (
                        <FormField
                            control={form.control}
                            name="practiceName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        {t('features.auth.sign_up.practice_name_label')}
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            autoComplete="organization"
                                            placeholder={t(
                                                'features.auth.sign_up.practice_name_placeholder'
                                            )}
                                            maxLength={PRACTICE_NAME_MAX_LENGTH}
                                            disabled={busy}
                                            {...field}
                                        />
                                    </FormControl>
                                    <p className="text-xs text-fg-muted">
                                        {t('features.auth.sign_up.practice_name_hint')}
                                    </p>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    ) : null}

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
                                        <DatePicker
                                            value={field.value || null}
                                            onChange={field.onChange}
                                            onBlur={field.onBlur}
                                            name={field.name}
                                            disabled={busy}
                                            locale={locale}
                                            openCalendarLabel={tForm('aria.open_date_picker')}
                                            labels={{
                                                previousMonth: tForm('previous_month'),
                                                nextMonth: tForm('next_month'),
                                                month: tForm('month'),
                                                year: tForm('year'),
                                                today: tForm('today'),
                                                pickADay: tForm('pick_a_day'),
                                            }}
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
