'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { Button, Typography } from '@rumtelo/ui';
import { useTranslations } from '@rumtelo/i18n';

import { sendVerificationEmail } from '@/lib/auth';
import { appSignInAfterAuthUrl, appSignInUrl } from '@/lib/portal-urls';
import { useOptionalPlanIntent } from '@/app/_components/plan-intent-provider';
import { useOptionalSignUpDraft } from '@/app/_components/sign-up-draft-provider';
import { useApiErrorMessage } from '@/app/_lib/api-error-messages';
import { planIntentQuery } from '@rumtelo/utils';

const RESEND_COOLDOWN_SEC = 60;

/**
 * Post-sign-up gate. Email is locked from draft / `?email=` — never an editable field.
 * Cold visits without a known address go back to sign-in / sign-up.
 */
export function VerifyPanel() {
    const t = useTranslations();
    const formatApiMessage = useApiErrorMessage();
    const searchParams = useSearchParams();
    const planIntent = useOptionalPlanIntent();
    const signUpDraft = useOptionalSignUpDraft();
    const emailFromDraft = signUpDraft?.draft?.email?.trim() ?? '';
    const emailFromQuery = searchParams.get('email')?.trim() ?? '';
    const lockedEmail = emailFromDraft || emailFromQuery;
    const status = searchParams.get('status');
    const confirmed = status === 'confirmed' || status === 'ok';
    const continueQuery = {
        ...planIntentQuery(planIntent?.intent ?? null),
    };

    const [apiError, setApiError] = useState<string | null>(null);
    const [sent, setSent] = useState(false);
    const [busy, setBusy] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    useEffect(() => {
        if (cooldown <= 0) return;
        const id = window.setTimeout(() => setCooldown(left => left - 1), 1000);
        return () => window.clearTimeout(id);
    }, [cooldown]);

    async function onResend() {
        if (!lockedEmail || cooldown > 0 || busy) return;
        setApiError(null);
        setBusy(true);

        const result = await sendVerificationEmail({
            email: lockedEmail,
            callbackURL: '/verify?status=confirmed',
        });

        setBusy(false);

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

        setSent(true);
        setCooldown(RESEND_COOLDOWN_SEC);
    }

    const subtitle = confirmed
        ? t('features.auth.verify.confirmed')
        : lockedEmail
          ? t('features.auth.verify.subtitle', { email: lockedEmail })
          : t('features.auth.verify.subtitle_no_target');

    const signUpHref = `/sign-up${
        Object.keys(continueQuery).length ? `?${new URLSearchParams(continueQuery).toString()}` : ''
    }`;

    return (
        <div className="grid gap-6">
            <div>
                <Typography as="h1" className="text-2xl lg:text-2xl">
                    {confirmed
                        ? t('features.auth.verify.confirmed_title')
                        : t('features.auth.verify.title')}
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
                    {t('features.auth.verify.continue')}
                </Button>
            ) : lockedEmail ? (
                <div className="grid gap-4">
                    {apiError ? (
                        <p
                            role="alert"
                            className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
                            {apiError}
                        </p>
                    ) : null}

                    {sent ? (
                        <p className="text-sm text-fg-secondary">
                            {t('features.auth.verify.sent')}
                        </p>
                    ) : null}

                    <div className="flex flex-col gap-3 sm:flex-row">
                        <Button
                            type="button"
                            variant="secondary"
                            disabled={busy || cooldown > 0}
                            className="sm:flex-1"
                            onClick={() => void onResend()}>
                            {cooldown > 0
                                ? t('features.auth.verify.resend_in', { seconds: cooldown })
                                : busy
                                  ? t('ui.form.working')
                                  : t('features.auth.verify.resend')}
                        </Button>
                        <Button
                            as="a"
                            href={appSignInAfterAuthUrl(continueQuery)}
                            variant="secondary"
                            className="sm:flex-1">
                            {t('features.auth.verify.continue')}
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="grid gap-4">
                    <Button as="a" href={appSignInUrl(continueQuery)} className="w-full">
                        {t('features.auth.verify.continue')}
                    </Button>
                </div>
            )}

            <Typography as="p" size="sm" color="muted" className="text-center">
                <Link href={signUpHref} className="font-semibold text-accent hover:underline">
                    {t('features.auth.verify.back_to_sign_up')}
                </Link>
                {' · '}
                <a
                    href={appSignInUrl(continueQuery)}
                    className="font-semibold text-accent hover:underline">
                    {t('features.auth.verify.back_to_sign_in')}
                </a>
            </Typography>
        </div>
    );
}
