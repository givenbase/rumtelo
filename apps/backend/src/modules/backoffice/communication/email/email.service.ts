import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

import type {
    ContactFormEmailInput,
    EmailProvider,
    EmailVerificationEmailInput,
    HouseholdInviteEmailInput,
    PasswordResetEmailInput,
    SendEmailInput,
} from './email.types';
import { EMAIL_BRAND } from './utils/brand.constants';
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
 * EMAIL_LOG_ONLY=true forces memory behaviour even when provider is resend.
 *
 * Brand logos are data-URI inlined in the HTML (sharp 3× PNGs) so
 * `/email-preview` and real clients render without remote fetches or CID.
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
            this.logger.log({
                event: 'email.memory',
                to,
                subject: input.subject,
                preview: input.html.slice(0, 120),
            });
            return true;
        }

        const { error } = await this.resend.emails.send({
            from,
            to,
            subject: input.subject,
            html: input.html,
            text: input.text,
            replyTo: input.replyTo,
        });

        if (error) {
            this.logger.error(`Resend failed: ${error.message}`);
            return false;
        }

        this.logger.log(`Sent email to ${to.join(', ')} — ${input.subject}`);
        return true;
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
            },
            locale
        );
        return this.send({ to, subject, html });
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
            },
            locale
        );

        return this.send({
            to: addressFromMailbox(this.defaultFrom),
            subject: `Contact: ${input.topic} — ${input.name}`,
            html,
            replyTo: input.email,
        });
    }

    /** Accept URL for an invitation id (application route). */
    inviteUrl(invitationId: string): string {
        return `${this.appOrigin}/invite/${invitationId}`;
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
