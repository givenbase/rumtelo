import { Heading, Section, Text } from '@react-email/components';

import * as React from 'react';

import EmailLayout from '../../../components/EmailLayout';
import { createEmailStyles } from '../../../styles';
import type { EmailLogoMode } from '../../../utils/email-brand-images.util';
import { createEmailTranslator } from '../../../utils/email-translation.util';

import { languageObject } from './translations';

export interface SignInOtpTemplateProps {
    darkMode?: boolean;
    expiresInMinutes?: number;
    firstName: string;
    locale?: string;
    otp: string;
    websiteUrl?: string;
    logoMode?: EmailLogoMode;
}

/**
 * Passwordless sign-in OTP — Better Auth `emailOTP` plugin (`type: sign-in`).
 */
export const SignInOtpTemplate: React.FC<SignInOtpTemplateProps> = ({
    firstName,
    otp,
    expiresInMinutes = 10,
    darkMode = false,
    locale = 'en',
    websiteUrl,
    logoMode,
}) => {
    const translate = createEmailTranslator(languageObject, locale);
    const styles = createEmailStyles(darkMode);

    return (
        <EmailLayout
            darkMode={darkMode}
            websiteUrl={websiteUrl}
            logoMode={logoMode}
            previewText={translate('email.auth.sign_in_otp.header.preview_text')}
            title={translate('email.auth.sign_in_otp.header.title')}>
            <Heading style={styles.heading}>
                {translate('email.auth.sign_in_otp.header.heading')}
            </Heading>

            <Section style={styles.section}>
                <Text style={styles.text}>
                    {translate('email.auth.sign_in_otp.body.greeting', { firstName })}
                </Text>
                <Text style={styles.text}>{translate('email.auth.sign_in_otp.body.message')}</Text>

                <Text style={{ ...styles.smallText, marginBottom: 8 }}>
                    {translate('email.auth.sign_in_otp.body.code_label')}
                </Text>
                <Text
                    style={{
                        ...styles.text,
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                        fontSize: 28,
                        fontWeight: 700,
                        letterSpacing: '0.35em',
                        textAlign: 'center' as const,
                        padding: '16px 12px',
                        borderRadius: 12,
                        backgroundColor: '#f4f4f5',
                    }}>
                    {otp}
                </Text>

                <Text style={styles.noteText}>
                    {translate('email.auth.sign_in_otp.body.expiration_note', {
                        expiresInMinutes,
                    })}
                </Text>
                <Text style={styles.smallText}>
                    {translate('email.auth.sign_in_otp.body.safety_note')}
                </Text>
            </Section>
        </EmailLayout>
    );
};

export default SignInOtpTemplate;
