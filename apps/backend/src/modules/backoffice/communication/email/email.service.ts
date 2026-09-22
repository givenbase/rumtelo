import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

import type {
    EmailProvider,
    EmailVerificationEmailInput,
    HouseholdInviteEmailInput,
    PasswordResetEmailInput,
    SendEmailInput,
} from './email.types';
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
 */
@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);
    private readonly provider: EmailProvider;
    private readonly defaultFrom: string;
    private readonly resend: Resend | undefined;
    private readonly appOrigin: string;

    constructor() {
        const env = loadEnv();
        this.provider = env.EMAIL_LOG_ONLY ? 'memory' : env.EMAIL_PROVIDER;
        this.defaultFrom = env.EMAIL_FROM;
        this.appOrigin = env.DOMAIN_APP.replace(/\/$/, '');

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
        const html = await renderTemplate(template, data, locale);
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

    /** Accept URL for an invitation id (application route). */
    inviteUrl(invitationId: string): string {
        return `${this.appOrigin}/invite/${invitationId}`;
    }
}
