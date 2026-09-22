import { Hr, Img, Link, Section, Text } from '@react-email/components';

import * as React from 'react';

import { emailBrand, emailFonts, emailLayout } from '../styles/email-tokens';
import { getTheme } from '../styles/theme-styles';
import { EMAIL_BRAND, EMAIL_LOGO_SIZE } from '../utils/brand.constants';
import { emailBrandDataUris } from '../utils/email-brand-images.util';

interface EmailFooterProps {
    companyName?: string;
    currentYear?: number;
    darkMode?: boolean;
    privacyUrl?: string;
    termsUrl?: string;
    websiteUrl?: string;
}

/** Footer chrome — icon mark (data-URI inlined), not a text wordmark. */
const EmailFooter: React.FC<EmailFooterProps> = ({
    companyName = EMAIL_BRAND.name,
    currentYear = new Date().getFullYear(),
    darkMode = false,
    privacyUrl = `${EMAIL_BRAND.websiteUrl}/privacy`,
    termsUrl = `${EMAIL_BRAND.websiteUrl}/terms`,
    websiteUrl = EMAIL_BRAND.websiteUrl,
}) => {
    const theme = getTheme(darkMode);
    const { width, height } = EMAIL_LOGO_SIZE.icon;
    const { icon } = emailBrandDataUris();

    const linkStyle = {
        color: darkMode ? '#4ed9d2' : emailBrand.accent,
        fontWeight: 600,
        textDecoration: 'underline',
    };

    return (
        <Section
            style={{
                backgroundColor: theme.colors.background,
                borderTop: `1px solid ${theme.colors.border}`,
                padding: `24px ${emailLayout.contentInset} 28px`,
                textAlign: 'center',
            }}>
            <Link href={websiteUrl} style={{ textDecoration: 'none', display: 'inline-block' }}>
                <Img
                    src={icon}
                    alt={EMAIL_BRAND.name}
                    width={width}
                    height={height}
                    style={{
                        display: 'block',
                        height: `${height}px`,
                        margin: '0 auto 10px',
                        width: `${width}px`,
                    }}
                />
            </Link>
            <Text
                style={{
                    color: theme.colors.textMuted,
                    fontFamily: emailFonts.sans,
                    fontSize: '13px',
                    lineHeight: '20px',
                    margin: '0 0 20px',
                }}>
                {EMAIL_BRAND.tagline}
            </Text>

            <Hr
                style={{
                    border: 'none',
                    borderTop: `1px solid ${theme.colors.divider}`,
                    margin: '0 auto 16px',
                    maxWidth: '140px',
                }}
            />

            <Text
                style={{
                    color: theme.colors.textMuted,
                    fontFamily: emailFonts.sans,
                    fontSize: '13px',
                    lineHeight: '22px',
                    margin: '0 0 8px',
                }}>
                <Link href={websiteUrl} style={linkStyle}>
                    Website
                </Link>
                {' · '}
                <Link href={privacyUrl} style={linkStyle}>
                    Privacy
                </Link>
                {' · '}
                <Link href={termsUrl} style={linkStyle}>
                    Terms
                </Link>
            </Text>

            <Text
                style={{
                    color: theme.colors.textMuted,
                    fontFamily: emailFonts.sans,
                    fontSize: '12px',
                    lineHeight: '18px',
                    margin: 0,
                }}>
                &copy; {currentYear} {companyName}
            </Text>
        </Section>
    );
};

export default EmailFooter;
