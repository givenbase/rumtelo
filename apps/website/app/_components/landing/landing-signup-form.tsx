'use client';

import { useForm, useWatch } from 'react-hook-form';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { LandingSignUpForm } from '@rumtelo/contracts';
import { zodResolver } from '@hookform/resolvers/zod';

import { useOptionalPlanIntent } from '@/app/_components/plan-intent-provider';
import { useOptionalSignUpDraft } from '@/app/_components/sign-up-draft-provider';
import { useMarketingSession } from '@/app/_components/marketing-session-provider';
import { ASSURANCES, SIGNUP_SECTION } from '@/lib/landing-content';
import { isRegistrationOpen } from '@/lib/maintenance';
import { appHomeUrl, appPlanSettingsUrl, appSignInUrl, webSignUpPath } from '@/lib/portal-urls';
import { planIntentQuery } from '@rumtelo/utils';

import { LandingIcon } from './landing-icon';
import { Cta, SectionHeading } from './landing-primitives';
import { Email } from '@rumtelo/ui';

const PLAN_SHORT = { BASIC: 'Basic', PLUS: 'Plus', MAX: 'Max' } as const;

const FIELDS = [
    {
        name: 'firstName' as const,
        label: 'First name',
        type: 'text',
        ph: 'Given name',
        autoComplete: 'given-name',
    },
    {
        name: 'lastName' as const,
        label: 'Last name',
        type: 'text',
        ph: 'Family name',
        autoComplete: 'family-name',
    },
    {
        name: 'email' as const,
        label: 'Email',
        type: 'email',
        ph: 'you@example.com',
        autoComplete: 'email',
    },
];

/**
 * Landing hand-off — collects name + email + terms, then routes to `/sign-up`.
 * Password and optional profile fields are completed on the register page.
 */
export function LandingSignupForm() {
    const router = useRouter();
    const signUpDraft = useOptionalSignUpDraft();
    const planIntent = useOptionalPlanIntent();
    const { isAuthenticated, isPending, user, planKey } = useMarketingSession();
    const form = useForm<LandingSignUpForm>({
        defaultValues: { firstName: '', lastName: '', email: '', terms: false },
        mode: 'onTouched',
        resolver: zodResolver(LandingSignUpForm),
    });

    const {
        register,
        handleSubmit,
        control,
        formState: { errors, isSubmitting, touchedFields, submitCount },
    } = form;

    const terms = useWatch({ control, name: 'terms' }) ?? false;

    function onSubmit(values: LandingSignUpForm) {
        signUpDraft?.setDraft({
            firstName: values.firstName,
            lastName: values.lastName,
            email: values.email,
        });
        router.push(webSignUpPath(planIntentQuery(planIntent?.intent ?? null)));
    }

    function fieldError(name: keyof LandingSignUpForm) {
        const show = Boolean(errors[name]) && (touchedFields[name] || submitCount > 0);
        return show ? errors[name]?.message : undefined;
    }

    if (!isPending && isAuthenticated) {
        const planLabel = planKey ? PLAN_SHORT[planKey] : null;
        return (
            <section
                id="signup"
                className="mx-auto max-w-6xl px-4 py-12 pb-14 lg:px-6 lg:py-20 lg:pb-24">
                <div className="overflow-hidden rounded-3xl border border-accent/35 bg-surface shadow-lg ring-1 ring-fg/8 ring-inset dark:ring-white/8">
                    <span className="block h-1 bg-(image:--gradient-accent)" />
                    <div className="flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between lg:gap-10 lg:p-10">
                        <div className="min-w-0">
                            <SectionHeading
                                eyebrow="YOU’RE IN"
                                headline={`Welcome back${user?.name ? `, ${user.name.split(' ')[0]}` : ''}`}
                                lead={
                                    planLabel
                                        ? `You’re on ${planLabel}. Open the dashboard to continue, or manage upgrade and billing in Plan settings.`
                                        : 'Open the dashboard to continue, or manage your plan in the app.'
                                }
                                headlineClassName="max-w-lg"
                            />
                        </div>
                        <div className="flex w-full max-w-sm flex-col gap-2 sm:flex-row lg:w-auto lg:max-w-none lg:shrink-0">
                            <Cta href={appHomeUrl()} size="lg" className="w-full sm:w-auto">
                                Open dashboard
                            </Cta>
                            <Cta
                                href={appPlanSettingsUrl()}
                                variant="ghost"
                                size="lg"
                                className="w-full sm:w-auto">
                                Plan & billing
                            </Cta>
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    if (!isRegistrationOpen()) {
        return (
            <section
                id="signup"
                className="mx-auto max-w-6xl px-4 py-12 pb-14 lg:px-6 lg:py-20 lg:pb-24">
                <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-lg ring-1 ring-fg/8 ring-inset dark:ring-white/8">
                    <span className="block h-1 bg-(image:--gradient-accent)" />
                    <div className="flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between lg:gap-10 lg:p-10">
                        <div className="min-w-0">
                            <SectionHeading
                                eyebrow="COMING SOON"
                                headline="New accounts open shortly"
                                lead="Registration is paused while we finish launch. Already on the team? Sign in with your Rumtelo account."
                                headlineClassName="max-w-lg"
                            />
                        </div>
                        <div className="flex w-full max-w-sm flex-col gap-2 sm:flex-row lg:w-auto lg:max-w-none lg:shrink-0">
                            <Cta href={appSignInUrl()} size="lg" className="w-full sm:w-auto">
                                Sign in
                            </Cta>
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section
            id="signup"
            className="mx-auto max-w-6xl px-4 py-12 pb-14 lg:px-6 lg:py-20 lg:pb-24">
            <div className="overflow-hidden rounded-3xl border border-accent/35 bg-surface shadow-lg ring-1 ring-fg/8 ring-inset dark:ring-white/8">
                <span className="block h-1 bg-(image:--gradient-accent)" />

                <div className="flex flex-col gap-7 p-5 sm:p-6 md:flex-row md:flex-wrap lg:gap-14 lg:p-10">
                    <div className="min-w-0 flex-1 md:basis-80">
                        <SectionHeading
                            eyebrow={SIGNUP_SECTION.eyebrow}
                            headline={SIGNUP_SECTION.headline}
                            lead={SIGNUP_SECTION.lead}
                            headlineClassName="max-w-sm"
                        />
                        <div className="mt-6 grid gap-3">
                            {ASSURANCES.map(assurance => (
                                <span
                                    key={assurance.text}
                                    className="flex min-w-0 items-start gap-2.5">
                                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
                                        <LandingIcon name={assurance.icon} size={17} />
                                    </span>
                                    <span className="pt-1 text-sm leading-relaxed text-fg-secondary">
                                        {assurance.text}
                                    </span>
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="w-full max-w-md min-w-0 flex-1 md:basis-80">
                        <form className="grid gap-3" onSubmit={handleSubmit(onSubmit)} noValidate>
                            <div className="grid gap-3 sm:grid-cols-2">
                                {FIELDS.filter(
                                    field => field.name === 'firstName' || field.name === 'lastName'
                                ).map(field => {
                                    const message = fieldError(field.name);
                                    return (
                                        <label key={field.name} className="grid gap-1.5">
                                            <span className="font-mono text-xs font-medium tracking-wide text-fg-faint uppercase">
                                                {field.label}
                                            </span>
                                            <input
                                                type={field.type}
                                                autoComplete={field.autoComplete}
                                                placeholder={field.ph}
                                                disabled={isSubmitting}
                                                aria-invalid={Boolean(message)}
                                                className={`w-full rounded-lg border bg-raised px-3.5 py-3 text-sm text-fg transition-colors outline-none focus:border-accent ${
                                                    message ? 'border-danger' : 'border-line'
                                                }`}
                                                {...register(field.name)}
                                            />
                                            {message ? (
                                                <span className="font-mono text-xs font-medium text-danger">
                                                    {message}
                                                </span>
                                            ) : null}
                                        </label>
                                    );
                                })}
                            </div>

                            {FIELDS.filter(field => field.name === 'email').map(field => {
                                const message = fieldError(field.name);
                                return (
                                    <label key={field.name} className="grid gap-1.5">
                                        <span className="font-mono text-xs font-medium tracking-wide text-fg-faint uppercase">
                                            {field.label}
                                        </span>
                                        <Email
                                            autoComplete={field.autoComplete}
                                            placeholder={field.ph}
                                            disabled={isSubmitting}
                                            aria-invalid={Boolean(message)}
                                            className={`w-full rounded-lg border bg-raised px-3.5 py-3 text-sm text-fg transition-colors outline-none focus:border-accent ${
                                                message ? 'border-danger' : 'border-line'
                                            }`}
                                            {...register(field.name)}
                                        />
                                        {message ? (
                                            <span className="font-mono text-xs font-medium text-danger">
                                                {message}
                                            </span>
                                        ) : null}
                                    </label>
                                );
                            })}

                            <label className="mt-1 flex cursor-pointer items-start gap-2.5">
                                <input type="checkbox" className="sr-only" {...register('terms')} />
                                <span
                                    className={`mt-px grid size-4 shrink-0 place-items-center rounded-sm border text-xs text-on-accent ${
                                        terms
                                            ? 'border-transparent bg-(image:--gradient-accent)'
                                            : 'border-line-strong bg-transparent'
                                    }`}>
                                    {terms ? '✓' : ''}
                                </span>
                                <span className="text-sm leading-relaxed text-fg-muted">
                                    {SIGNUP_SECTION.termsBefore}
                                    <Link
                                        href="/terms"
                                        className="text-accent underline-offset-2 hover:underline">
                                        {SIGNUP_SECTION.termsLink}
                                    </Link>
                                    {SIGNUP_SECTION.termsMid}
                                    <Link
                                        href="/privacy"
                                        className="text-accent underline-offset-2 hover:underline">
                                        {SIGNUP_SECTION.privacyLink}
                                    </Link>
                                    {SIGNUP_SECTION.termsAfter}
                                </span>
                            </label>
                            {fieldError('terms') ? (
                                <span className="font-mono text-xs font-medium text-danger">
                                    {fieldError('terms')}
                                </span>
                            ) : null}

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="mt-1.5 w-full rounded-full border-0 bg-(image:--gradient-accent) py-4 font-mono text-xs font-bold tracking-wide text-on-accent uppercase shadow-glow transition-all hover:brightness-105 active:scale-95 disabled:opacity-60">
                                {SIGNUP_SECTION.submit}
                            </button>

                            <span className="text-center font-mono text-xs font-medium tracking-wide text-fg-faint">
                                Already have an account?{' '}
                                <Link
                                    href={appSignInUrl()}
                                    className="text-accent hover:text-accent-hover">
                                    Sign in
                                </Link>
                            </span>
                        </form>
                    </div>
                </div>
            </div>
        </section>
    );
}
