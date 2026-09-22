import { Heading, Section, Text } from '@react-email/components';

import * as React from 'react';

import Button from '../../../components/Button';
import EmailLayout from '../../../components/EmailLayout';
import { createEmailStyles } from '../../../styles';
import { createEmailTranslator } from '../../../utils/email-translation.util';

import { languageObject } from './translations';

export interface AccountVerificationTemplateProps {
    darkMode?: boolean;
    expiresInHours?: number;
    firstName: string;
    locale?: string;
    verificationUrl: string;
    websiteUrl?: string;
}

/**
 * Account email verification — Better Auth `emailVerification.sendVerificationEmail`.
 * React Email components.
 */
export const AccountVerificationTemplate: React.FC<AccountVerificationTemplateProps> = ({
    firstName,
    verificationUrl,
    expiresInHours = 48,
    darkMode = false,
    locale = 'en',
    websiteUrl,
}) => {
    const translate = createEmailTranslator(languageObject, locale);
    const styles = createEmailStyles(darkMode);

    return (
        <EmailLayout
            darkMode={darkMode}
            websiteUrl={websiteUrl}
            previewText={translate('email.auth.verification.header.preview_text')}
            title={translate('email.auth.verification.header.title')}>
            <Heading style={styles.heading}>
                {translate('email.auth.verification.header.heading')}
            </Heading>

            <Section style={styles.section}>
                <Text style={styles.text}>
                    {translate('email.auth.verification.body.greeting', { firstName })}
                </Text>
                <Text style={styles.text}>{translate('email.auth.verification.body.message')}</Text>

                <Button darkMode={darkMode} href={verificationUrl} size="large">
                    {translate('email.auth.verification.body.button')}
                </Button>

                <Text style={styles.noteText}>
                    {translate('email.auth.verification.body.expiration_note', { expiresInHours })}
                </Text>
                <Text style={styles.noteText}>
                    {translate('email.auth.verification.body.renewal_note')}
                </Text>
                <Text style={styles.smallText}>
                    {translate('email.auth.verification.body.safety_note')}
                </Text>
            </Section>
        </EmailLayout>
    );
};

export default AccountVerificationTemplate;
