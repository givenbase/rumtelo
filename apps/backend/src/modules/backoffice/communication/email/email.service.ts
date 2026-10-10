import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

import type {
    ContactFormEmailInput,
    EmailProvider,
    EmailVerificationEmailInput,
    HouseholdInviteAcceptedEmailInput,
    HouseholdInviteEmailInput,
    PasswordResetEmailInput,
    PracticeClientInviteEmailInput,
    SendEmailInput,
    SignInOtpEmailInput,
} from './email.types';
import { EMAIL_BRAND } from './utils/brand.constants';
import { emailBrandCidAttachments } from './utils/email-brand-images.util';
import { pushMemoryEmail } from './utils/memory-outbox';
import { EmailTemplate, renderTemplate } from './utils/template-adapter';

import { loadEnv } from '../../../../common/config/env.config';

/**
 * Outbound email — Rumtelo writes (backoffice). Households never send.
 *
 * Templates are React Email components rendered via
 * `@react-email/render` — never hand-rolled HTML strings.
 *
 * Providers:
 *   memory  — log only (default; safe for local)
 *   resend  — Resend API when EMAIL_PROVIDER=resend + RESEND_API_KEY
 * EMAIL_LOG_ONLY=true forces memory behavior even when provider is resend.
 *
 * Logos: Resend uses CID attachments (Gmail strips data-URIs). `/email-preview`
 * and the memory provider keep data-URIs so HTML is viewable in a browser.
 */
@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);
    private readonly provider: EmailProvider;
    private readonly defaultFrom: string;
    private readonly resend: Resend | undefined;
    private readonly appOrigin: string;
    private readonly webOrigin: string;

    constructor() {
        const env = loadEnv();
        this.provider = env.EMAIL_LOG_ONLY ? 'memory' : env.EMAIL_PROVIDER;
        this.defaultFrom = env.EMAIL_FROM;
        this.appOrigin = env.DOMAIN_APP.replace(/\/$/, '');
        this.webOrigin = env.DOMAIN_WEB.replace(/\/$/, '');

        if (this.provider === 'resend') {
            if (!env.RESEND_API_KEY) {
                this.logger.error('EMAIL_PROVIDER=resend but RESEND_API_KEY is missing');
            } else {
                this.resend = new Resend(env.RESEND_API_KEY);
            }
        }

        this.logger.log(
            `Email ready (provider=${this.provider}${env.EMAIL_LOG_ONLY ? ', log-only' : ''}, from=${this.defaultFrom})`
        );
    }

    async send(input: SendEmailInput): Promise<boolean> {
        const to = Array.isArray(input.to) ? input.to : [input.to];
        const from = input.from ?? this.defaultFrom;

        if (this.provider === 'memory' || !this.resend) {
            pushMemoryEmail({ to, subject: input.subject, html: input.html });
            this.logger.log({
                event: 'email.memory',
                to,
                subject: input.subject,
                preview: input.html.slice(0, 120),
            });
            return true;
        }

        const attachments = input.attachments ?? emailBrandCidAttachments();

        const { error } = await this.resend.emails.send({
            from,
            to,
            subject: input.subject,
            html: input.html,
            text: input.text,
            replyTo: input.replyTo,
            attachments: attachments.map(a => ({
                filename: a.filename,
                content: a.content,
                contentId: a.contentId,
                contentType: a.contentType,
            })),
        });

        if (error) {
            this.logger.error(`Resend failed: ${error.message}`);
            return false;
        }

        this.logger.log(`Sent email to ${to.join(', ')} — ${input.subject}`);
        return true;
    }

    /** True when this send will hit Resend (not memory / log-only). */
    private get usesResend(): boolean {
        return this.provider === 'resend' && Boolean(this.resend);
    }

    /** Render React Email template + send. */
    private async sendTemplatedEmail(
        to: string,
        subject: string,
        template: EmailTemplate,
        data: Record<string, unknown>,
        locale = 'en'
    ): Promise<boolean> {
        const html = await renderTemplate(
            template,
            {
                ...data,
                websiteUrl: this.webOrigin,
                // Gmail strips data: URIs — CID + attachments for real delivery.
                logoMode: this.usesResend ? 'cid' : 'data-uri',
            },
            locale
        );
        return this.send({
            to,
            subject,
            html,
            attachments: this.usesResend ? emailBrandCidAttachments() : undefined,
        });
    }

    /** Household invite — called after better-auth createInvitation. */
    async sendHouseholdInvite(input: HouseholdInviteEmailInput): Promise<boolean> {
        const locale = input.locale ?? 'en';
        return this.sendTemplatedEmail(
            input.to,
            locale === 'nl' ? 'Huishouden uitnodiging — Rumtelo' : 'Household invite — Rumtelo',
            EmailTemplate.HOUSEHOLD_INVITE,
            {
                householdName: input.householdName,
                inviteUrl: input.inviteUrl,
                inviterName: input.inviterName,
                role: input.role,
            },
            locale
        );
    }

    /** Owners/admins — someone accepted a household invite. */
    async sendHouseholdInviteAccepted(input: HouseholdInviteAcceptedEmailInput): Promise<boolean> {
        const locale = input.locale ?? 'en';
        return this.sendTemplatedEmail(
            input.to,
            locale === 'nl'
                ? 'Uitnodiging geaccepteerd — Rumtelo'
                : 'Invitation accepted — Rumtelo',
            EmailTemplate.HOUSEHOLD_INVITE_ACCEPTED,
            {
                householdName: input.householdName,
                membersUrl: input.membersUrl,
                memberName: input.memberName,
                memberEmail: input.memberEmail,
                role: input.role,
            },
            locale
        );
    }

    /** Practice client invite — new signup, continue onboarding, or accept in settings. */
    async sendPracticeClientInvite(input: PracticeClientInviteEmailInput): Promise<boolean> {
        const locale = input.locale ?? 'en';
        return this.sendTemplatedEmail(
            input.to,
            locale === 'nl' ? 'Practice-uitnodiging — Rumtelo' : 'Practice invitation — Rumtelo',
            EmailTemplate.PRACTICE_CLIENT_INVITE,
            {
                practiceName: input.practiceName,
                inviteUrl: input.inviteUrl,
                inviterName: input.inviterName,
                access: input.access,
                variant: input.variant,
            },
            locale
        );
    }

    /** App settings (practice links) — practice dual-consent accept card. */
    practiceClientAcceptUrl(): string {
        return `${this.appOrigin}/settings/general/practice`;
    }

    /** Marketing signup with practice invite token (brand-new account). */
    practiceClientSignupUrl(token: string, email: string): string {
        const params = new URLSearchParams({
            practiceInvite: token,
            email,
        });
        return `${this.webOrigin}/sign-up?${params.toString()}`;
    }

    /** App sign-in + finish onboarding for users who already have an account. */
    practiceClientContinueUrl(token: string, email: string): string {
        const params = new URLSearchParams({
            practiceInvite: token,
            email,
        });
        return `${this.appOrigin}/sign-in?${params.toString()}`;
    }

    /** Account email verification — Better Auth `emailVerification.sendVerificationEmail`. */
    async sendEmailVerificationEmail(input: EmailVerificationEmailInput): Promise<boolean> {
        const locale = input.locale ?? 'en';
        return this.sendTemplatedEmail(
            input.to,
            locale === 'nl' ? 'Verifieer je e-mail — Rumtelo' : 'Verify your email — Rumtelo',
            EmailTemplate.ACCOUNT_VERIFICATION,
            {
                firstName: input.firstName,
                verificationUrl: input.verificationUrl,
                expiresInHours: input.expiresInHours ?? 48,
            },
            locale
        );
    }

    /** Password reset — Better Auth `emailAndPassword.sendResetPassword`. */
    async sendPasswordResetEmail(input: PasswordResetEmailInput): Promise<boolean> {
        const locale = input.locale ?? 'en';
        return this.sendTemplatedEmail(
            input.to,
            locale === 'nl' ? 'Wachtwoord resetten — Rumtelo' : 'Reset your password — Rumtelo',
            EmailTemplate.PASSWORD_RESET,
            {
                firstName: input.firstName,
                resetUrl: input.resetUrl,
                expiresInHours: input.expiresInHours ?? 1,
            },
            locale
        );
    }

    /** Passwordless sign-in OTP — Better Auth `emailOTP` (`type: sign-in`). */
    async sendSignInOtpEmail(input: SignInOtpEmailInput): Promise<boolean> {
        const locale = input.locale ?? 'en';
        return this.sendTemplatedEmail(
            input.to,
            locale === 'nl' ? 'Je inlogcode — Rumtelo' : 'Your sign-in code — Rumtelo',
            EmailTemplate.SIGN_IN_OTP,
            {
                firstName: input.firstName,
                otp: input.otp,
                expiresInMinutes: input.expiresInMinutes ?? 10,
            },
            locale
        );
    }

    /** Marketing-site contact form → EMAIL_FROM inbox (reply-to = submitter). */
    async sendContactFormEmail(input: ContactFormEmailInput): Promise<boolean> {
        const locale = input.locale ?? 'en';
        const html = await renderTemplate(
            EmailTemplate.CONTACT_FORM,
            {
                name: input.name,
                email: input.email,
                topic: input.topic,
                message: input.message,
                phone: input.phone,
                websiteUrl: this.webOrigin,
                logoMode: this.usesResend ? 'cid' : 'data-uri',
            },
            locale
        );

        return this.send({
            to: addressFromMailbox(this.defaultFrom),
            subject: `Contact: ${input.topic} — ${input.name}`,
            html,
            replyTo: input.email,
            attachments: this.usesResend ? emailBrandCidAttachments() : undefined,
        });
    }

    /** Accept URL for an invitation id (application route). */
    inviteUrl(invitationId: string, email?: string): string {
        const url = new URL(`/invite/${invitationId}`, `${this.appOrigin}/`);
        if (email?.trim()) url.searchParams.set('email', email.trim());
        return url.toString();
    }

    /** Household members settings — for owner/admin notify emails. */
    householdMembersSettingsUrl(): string {
        return new URL('/settings/general/household', `${this.appOrigin}/`).toString();
    }

    /** Marketing site origin used in email chrome links. */
    get websiteUrl(): string {
        return this.webOrigin || EMAIL_BRAND.websiteUrl;
    }
}

/** `Rumtelo <info@rumtelo.app>` → `info@rumtelo.app` (Resend `to` wants a bare address). */
function addressFromMailbox(mailbox: string): string {
    const match = /<([^>]+)>/.exec(mailbox);
    return (match?.[1] ?? mailbox).trim();
}
