'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

import { useTranslations } from '@rumtelo/i18n';
import { BrandLoader, Button, Input, Typography } from '@rumtelo/ui';
import { householdInvitePath, writeHouseholdInvite } from '@rumtelo/utils';

import {
    acceptOrganizationInvitation,
    getOrganizationInvitation,
    sendSignInOtp,
    setActiveOrganization,
    signInWithOtp,
    useSession,
} from '@/app/_lib/auth';
import { env } from '@/app/_utils/get-env';
import { useAuth } from '@/components/features/shell/auth-provider';
import { useOptionalHouseholdInvite } from '@/components/features/shell/household-invite-provider';

type InviteLoad = 'idle' | 'ready' | 'error';

/**
 * Household invite accept — email links land here (`/invite/{id}`).
 * Passwordless OTP first; invitees never run creator onboarding.
 */
export default function HouseholdInvitePage() {
    const t = useTranslations();
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const invitationId = typeof params.invitationId === 'string' ? params.invitationId : '';
    const emailFromQuery = searchParams.get('email')?.trim() ?? '';
    const { data: session, isPending: sessionPending } = useSession();
    const { refreshSession, setActiveHousehold } = useAuth();
    const householdInvite = useOptionalHouseholdInvite();

    const [codeSent, setCodeSent] = useState(false);
    const [inviteLoad, setInviteLoad] = useState<InviteLoad>('idle');
    const [accepting, setAccepting] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [householdName, setHouseholdName] = useState<string | null>(null);
    const [inviteEmail, setInviteEmail] = useState(emailFromQuery);
    const [otp, setOtp] = useState('');
    const [busy, setBusy] = useState(false);

    const signedIn = Boolean(session?.user?.id);

    useEffect(() => {
        if (!invitationId) return;
        writeHouseholdInvite(invitationId, {
            domainUrls: [env.NEXT_PUBLIC_DOMAIN_WEB, env.NEXT_PUBLIC_DOMAIN_APP],
        });
        householdInvite?.setInvitationId(invitationId);
    }, [householdInvite, invitationId]);

    useEffect(() => {
        if (!invitationId || sessionPending || !signedIn) return;

        let cancelled = false;
        void (async () => {
            try {
                const invitation = await getOrganizationInvitation(invitationId);
                if (cancelled) return;
                setHouseholdName(invitation.organizationName ?? null);
                setInviteEmail(invitation.email ?? emailFromQuery);
                setError(null);
                setInviteLoad('ready');
            } catch {
                if (cancelled) return;
                setError(t('common.message.error.api.invitation_not_found'));
                setInviteLoad('error');
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [invitationId, sessionPending, signedIn, emailFromQuery, t]);

    async function sendCode() {
        const email = inviteEmail.trim();
        if (!email) {
            setError(t('ui.form.incomplete_description'));
            return;
        }
        setBusy(true);
        setError(null);
        try {
            const result = await sendSignInOtp(email);
            if (result.error) {
                setError(result.error.message?.trim() || t('common.message.error.generic'));
                return;
            }
            setCodeSent(true);
        } catch {
            setError(t('common.message.error.generic'));
        } finally {
            setBusy(false);
        }
    }

    async function verifyCode() {
        const email = inviteEmail.trim();
        if (!email || !otp.trim()) {
            setError(t('ui.form.incomplete_description'));
            return;
        }
        setBusy(true);
        setError(null);
        try {
            const result = await signInWithOtp(email, otp, email.split('@')[0]);
            if (result.error) {
                setError(result.error.message?.trim() || t('common.message.error.generic'));
                return;
            }
            await refreshSession();
            setCodeSent(false);
        } catch {
            setError(t('common.message.error.generic'));
        } finally {
            setBusy(false);
        }
    }

    async function accept() {
        if (!invitationId) return;
        setAccepting(true);
        setError(null);
        try {
            const result = await acceptOrganizationInvitation(invitationId);
            const organizationId =
                (result.data as { invitation?: { organizationId?: string } } | undefined)
                    ?.invitation?.organizationId ??
                (result.data as { member?: { organizationId?: string } } | undefined)?.member
                    ?.organizationId;
            if (organizationId) {
                await setActiveOrganization(organizationId);
                await setActiveHousehold(organizationId);
            }
            householdInvite?.clearInvitationId();
            await refreshSession();
            setDone(true);
            router.replace('/');
            router.refresh?.();
        } catch {
            setError(t('common.message.error.api.invitation_accept_failed'));
            setInviteLoad('error');
            setAccepting(false);
        }
    }

    if (sessionPending || accepting || done || (signedIn && inviteLoad === 'idle')) {
        return <BrandLoader label={t('ui.statusPage.loading')} />;
    }

    if (signedIn && inviteLoad === 'error') {
        return (
            <div className="grid gap-4 text-center">
                <Typography as="h1" size="lg" weight="bold">
                    {t('features.auth.invite.title')}
                </Typography>
                <Typography as="p" size="sm" color="muted">
                    {error ?? t('common.message.error.generic')}
                </Typography>
                <Button variant="secondary" onClick={() => router.push('/')}>
                    {t('features.auth.invite.go_home')}
                </Button>
            </div>
        );
    }

    if (!signedIn) {
        const invitePath = householdInvitePath(invitationId);
        const signInHref = `/sign-in?redirectTo=${encodeURIComponent(invitePath)}&householdInvite=${encodeURIComponent(invitationId)}${inviteEmail ? `&email=${encodeURIComponent(inviteEmail)}` : ''}`;

        return (
            <div className="grid gap-5 text-center">
                <Typography as="h1" size="lg" weight="bold">
                    {t('features.auth.invite.title')}
                </Typography>
                <Typography as="p" size="sm" color="muted">
                    {t('features.auth.invite.sign_in_body')}
                </Typography>

                <div className="grid gap-3 text-left">
                    <label className="grid gap-1.5">
                        <span className="text-xs font-medium text-fg-muted">
                            {t('features.auth.invite.email_label')}
                        </span>
                        <Input
                            type="email"
                            autoComplete="email"
                            value={inviteEmail}
                            onChange={event => setInviteEmail(event.target.value)}
                            disabled={Boolean(emailFromQuery) || busy}
                        />
                    </label>

                    {codeSent ? (
                        <>
                            <Typography as="p" size="xs" color="muted">
                                {t('features.auth.invite.code_sent')}
                            </Typography>
                            <label className="grid gap-1.5">
                                <span className="text-xs font-medium text-fg-muted">
                                    {t('features.auth.invite.code_label')}
                                </span>
                                <Input
                                    type="text"
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    maxLength={8}
                                    value={otp}
                                    onChange={event =>
                                        setOtp(event.target.value.replace(/\D/g, '').slice(0, 8))
                                    }
                                    disabled={busy}
                                />
                            </label>
                            <Typography as="p" size="xs" color="muted">
                                {t('features.auth.invite.otp_hint')}
                            </Typography>
                            {error ? (
                                <p role="alert" className="text-sm text-danger">
                                    {error}
                                </p>
                            ) : null}
                            <Button disabled={busy} onClick={() => void verifyCode()}>
                                {t('features.auth.invite.verify_code')}
                            </Button>
                            <Button
                                variant="secondary"
                                disabled={busy}
                                onClick={() => void sendCode()}>
                                {t('features.auth.invite.resend_code')}
                            </Button>
                        </>
                    ) : (
                        <>
                            {error ? (
                                <p role="alert" className="text-sm text-danger">
                                    {error}
                                </p>
                            ) : null}
                            <Button disabled={busy} onClick={() => void sendCode()}>
                                {t('features.auth.invite.send_code')}
                            </Button>
                        </>
                    )}
                </div>

                <p className="text-center">
                    <Link
                        href={signInHref}
                        className="text-sm text-fg-muted hover:text-accent hover:underline">
                        {t('features.auth.invite.password_instead')}
                    </Link>
                </p>
            </div>
        );
    }

    return (
        <div className="grid gap-5 text-center">
            <Typography as="h1" size="lg" weight="bold">
                {t('features.auth.invite.title')}
            </Typography>
            <Typography as="p" size="sm" color="muted">
                {householdName
                    ? t('features.auth.invite.body_named', { name: householdName })
                    : t('features.auth.invite.body')}
            </Typography>
            {inviteEmail ? (
                <Typography as="p" size="xs" color="muted">
                    {inviteEmail}
                </Typography>
            ) : null}
            <Typography as="p" size="xs" color="muted">
                {t('features.auth.invite.no_onboarding')}
            </Typography>
            {error ? (
                <p role="alert" className="text-sm text-danger">
                    {error}
                </p>
            ) : null}
            <Button onClick={() => void accept()}>{t('features.auth.invite.accept')}</Button>
            <p className="text-center">
                <Link href="/" className="text-sm text-fg-muted hover:text-accent hover:underline">
                    {t('features.auth.invite.go_home')}
                </Link>
            </p>
        </div>
    );
}
