export type EmailProvider = 'resend' | 'memory';

export type EmailCidAttachment = {
    filename: string;
    content: string;
    contentId: string;
    contentType?: string;
};

export type SendEmailInput = {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
    from?: string;
    replyTo?: string;
    /** CID logo attachments for Resend (base64 content). */
    attachments?: EmailCidAttachment[];
};

export type HouseholdInviteEmailInput = {
    to: string;
    householdName: string;
    inviteUrl: string;
    inviterName?: string;
    role?: string;
    locale?: string;
};

export type PracticeClientInviteEmailInput = {
    to: string;
    practiceName: string;
    inviteUrl: string;
    inviterName?: string;
    access: 'VIEW' | 'MANAGE';
    /** new_or_continue = signup/onboard; existing_household = accept in settings */
    variant: 'new_or_continue' | 'existing_household';
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

export type SignInOtpEmailInput = {
    to: string;
    firstName: string;
    otp: string;
    expiresInMinutes?: number;
    locale?: string;
};

export type ContactFormEmailInput = {
    name: string;
    email: string;
    topic: string;
    message: string;
    /** Optional E.164 phone from the submitter. */
    phone?: string;
    locale?: string;
};
