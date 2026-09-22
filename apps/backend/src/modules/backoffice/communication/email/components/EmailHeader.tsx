import { Img, Link, Section } from '@react-email/components';

import * as React from 'react';

import { emailBrand, emailLayout } from '../styles/email-tokens';
import { getTheme } from '../styles/theme-styles';
import { EMAIL_BRAND, EMAIL_LOGO_SIZE } from '../utils/brand.constants';
import { emailBrandDataUris } from '../utils/email-brand-images.util';

interface EmailHeaderProps {
    darkMode?: boolean;
    showLogo?: boolean;
    websiteUrl?: string;
}

/** Header chrome — full wordmark only; tagline lives in the footer. */
const EmailHeader: React.FC<EmailHeaderProps> = ({
    websiteUrl = EMAIL_BRAND.websiteUrl,
    darkMode = false,
    showLogo = true,
}) => {
    if (!showLogo) return null;

    const theme = getTheme(darkMode);
    const { width, height } = EMAIL_LOGO_SIZE.wordmark;
    const { wordmark } = emailBrandDataUris();

    return (
        <Section style={{ margin: 0, padding: 0 }}>
            <div
                style={{
                    backgroundColor: emailBrand.accent,
                    fontSize: '3px',
                    height: '3px',
                    lineHeight: '3px',
                }}>
                &nbsp;
            </div>
            <Section
                style={{
                    backgroundColor: theme.colors.background,
                    borderBottom: `1px solid ${theme.colors.border}`,
                    padding: `24px ${emailLayout.contentInset} 20px`,
                    textAlign: 'center',
                }}>
                <Link href={websiteUrl} style={{ textDecoration: 'none', display: 'inline-block' }}>
                    <Img
                        src={wordmark}
                        alt={EMAIL_BRAND.name}
                        width={width}
                        height={height}
                        style={{
                            display: 'block',
                            height: `${height}px`,
                            margin: '0 auto',
                            width: `${width}px`,
                        }}
                    />
                </Link>
            </Section>
        </Section>
    );
};

export default EmailHeader;
