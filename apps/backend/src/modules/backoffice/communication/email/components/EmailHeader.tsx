import { Img, Link, Section } from '@react-email/components';

import * as React from 'react';

import { emailBrand, emailLayout } from '../styles/email-tokens';
import { getTheme } from '../styles/theme-styles';
import { EMAIL_BRAND, EMAIL_LOGO_SIZE } from '../utils/brand.constants';
import { emailBrandLogoSrcs, type EmailLogoMode } from '../utils/email-brand-images.util';

interface EmailHeaderProps {
    darkMode?: boolean;
    showLogo?: boolean;
    websiteUrl?: string;
    /** `cid` for Resend; `data-uri` for browser preview. */
    logoMode?: EmailLogoMode;
}

/** Header chrome — on-light / on-dark wordmark pair; tagline lives in the footer. */
const EmailHeader: React.FC<EmailHeaderProps> = ({
    websiteUrl = EMAIL_BRAND.websiteUrl,
    darkMode = false,
    showLogo = true,
    logoMode = 'data-uri',
}) => {
    if (!showLogo) return null;

    const theme = getTheme(darkMode);
    const { width, height } = EMAIL_LOGO_SIZE.wordmark;
    const logos = emailBrandLogoSrcs(logoMode);
    const imgStyle = {
        display: 'block' as const,
        height: `${height}px`,
        margin: '0 auto',
        width: `${width}px`,
    };

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
                    {darkMode ? (
                        <Img
                            src={logos.wordmarkDark}
                            alt={EMAIL_BRAND.name}
                            width={width}
                            height={height}
                            style={imgStyle}
                        />
                    ) : (
                        <>
                            {/* Light default — hidden when client is in dark mode (see EMAIL_WORDMARK_THEME_CSS). */}
                            <Img
                                className="rumtelo-wm-light"
                                src={logos.wordmarkLight}
                                alt={EMAIL_BRAND.name}
                                width={width}
                                height={height}
                                style={imgStyle}
                            />
                            {/* Dark surface wordmark — shown under prefers-color-scheme: dark. */}
                            <Img
                                className="rumtelo-wm-dark"
                                src={logos.wordmarkDark}
                                alt=""
                                width={width}
                                height={height}
                                style={{ ...imgStyle, display: 'none' }}
                            />
                        </>
                    )}
                </Link>
            </Section>
        </Section>
    );
};

export default EmailHeader;
