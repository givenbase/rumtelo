export type EmailProvider = 'resend' | 'memory';

export type SendEmailInput = {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
    from?: string;
    replyTo?: string;
};

export type HouseholdInviteEmailInput = {
    to: string;
    householdName: string;
    inviteUrl: string;
    inviterName?: string;
    role?: string;
    locale?: string;
};

export type EmailVerificationEmailInput = {
    to: string;
    firstName: string;
    verificationUrl: string;
    expiresInHours?: number;
    locale?: string;
};

export type PasswordResetEmailInput = {
    to: string;
    firstName: string;
    resetUrl: string;
    expiresInHours?: number;
    locale?: string;
};

export type ContactFormEmailInput = {
    name: string;
    email: string;
    topic: string;
    message: string;
    locale?: string;
};
