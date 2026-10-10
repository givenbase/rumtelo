import { Logger } from '@nestjs/common';
import { render } from '@react-email/render';

import * as React from 'react';

import AccountVerificationTemplate from '../templates/auth/account-verification';
import PasswordResetTemplate from '../templates/auth/password-reset';
import SignInOtpTemplate from '../templates/auth/sign-in-otp';
import ContactFormTemplate from '../templates/forms/contact-form';
import HouseholdInviteTemplate from '../templates/household/household-invite';
import HouseholdInviteAcceptedTemplate from '../templates/household/household-invite-accepted';
import PracticeClientInviteTemplate from '../templates/practice/practice-client-invite';

const logger = new Logger('EmailTemplateAdapter');

/** Email template ids. */
export enum EmailTemplate {
    ACCOUNT_VERIFICATION = 'account-verification',
    PASSWORD_RESET = 'password-reset',
    SIGN_IN_OTP = 'sign-in-otp',
    HOUSEHOLD_INVITE = 'household-invite',
    HOUSEHOLD_INVITE_ACCEPTED = 'household-invite-accepted',
    PRACTICE_CLIENT_INVITE = 'practice-client-invite',
    CONTACT_FORM = 'contact-form',
}

/**
 * Renders a React Email template to HTML.
 */
export async function renderTemplate(
    template: EmailTemplate,
    data: Record<string, unknown>,
    locale = 'en'
): Promise<string> {
    let element: React.ReactElement;

    switch (template) {
        case EmailTemplate.ACCOUNT_VERIFICATION:
            element = React.createElement(AccountVerificationTemplate, {
                ...data,
                locale,
            } as React.ComponentProps<typeof AccountVerificationTemplate>);
            break;

        case EmailTemplate.PASSWORD_RESET:
            element = React.createElement(PasswordResetTemplate, {
                ...data,
                locale,
            } as React.ComponentProps<typeof PasswordResetTemplate>);
            break;

        case EmailTemplate.SIGN_IN_OTP:
            element = React.createElement(SignInOtpTemplate, {
                ...data,
                locale,
            } as React.ComponentProps<typeof SignInOtpTemplate>);
            break;

        case EmailTemplate.HOUSEHOLD_INVITE:
            element = React.createElement(HouseholdInviteTemplate, {
                ...data,
                locale,
            } as React.ComponentProps<typeof HouseholdInviteTemplate>);
            break;

        case EmailTemplate.HOUSEHOLD_INVITE_ACCEPTED:
            element = React.createElement(HouseholdInviteAcceptedTemplate, {
                ...data,
                locale,
            } as React.ComponentProps<typeof HouseholdInviteAcceptedTemplate>);
            break;

        case EmailTemplate.PRACTICE_CLIENT_INVITE:
            element = React.createElement(PracticeClientInviteTemplate, {
                ...data,
                locale,
            } as React.ComponentProps<typeof PracticeClientInviteTemplate>);
            break;

        case EmailTemplate.CONTACT_FORM:
            element = React.createElement(ContactFormTemplate, {
                ...data,
                locale,
            } as React.ComponentProps<typeof ContactFormTemplate>);
            break;

        default: {
            const exhaustive: never = template;
            throw new Error(`Unknown email template: ${String(exhaustive)}`);
        }
    }

    try {
        return await render(element);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to render email template '${template}': ${message}`);
        throw error;
    }
}
