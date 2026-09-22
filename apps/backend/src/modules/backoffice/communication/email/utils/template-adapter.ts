import { Logger } from '@nestjs/common';
import { render } from '@react-email/render';

import * as React from 'react';

import AccountVerificationTemplate from '../templates/auth/account-verification';
import PasswordResetTemplate from '../templates/auth/password-reset';
import HouseholdInviteTemplate from '../templates/household/household-invite';

const logger = new Logger('EmailTemplateAdapter');

/** Email template ids. */
export enum EmailTemplate {
    ACCOUNT_VERIFICATION = 'account-verification',
    PASSWORD_RESET = 'password-reset',
    HOUSEHOLD_INVITE = 'household-invite',
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

        case EmailTemplate.HOUSEHOLD_INVITE:
            element = React.createElement(HouseholdInviteTemplate, {
                ...data,
                locale,
            } as React.ComponentProps<typeof HouseholdInviteTemplate>);
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
