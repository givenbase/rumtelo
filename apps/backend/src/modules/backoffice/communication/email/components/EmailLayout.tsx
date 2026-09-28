import { Body, Container, Head, Html, Preview } from '@react-email/components';

import * as React from 'react';

import {
    emailBrand,
    emailFonts,
    emailLayout,
    emailRadii,
    emailShadow,
} from '../styles/email-tokens';
import { getTheme } from '../styles/theme-styles';
import type { EmailLogoMode } from '../utils/email-brand-images.util';
import { EMAIL_WORDMARK_THEME_CSS } from '../utils/email-brand-images.util';
import EmailFooter from './EmailFooter';
import EmailHeader from './EmailHeader';

interface EmailLayoutProps {
    children: React.ReactNode;
    darkMode?: boolean;
    footerProps?: React.ComponentProps<typeof EmailFooter>;
    headerProps?: React.ComponentProps<typeof EmailHeader>;
    previewText?: string;
    title?: string;
    /** Marketing site origin — wires header/footer logo links + legal URLs. */
    websiteUrl?: string;
    /**
     * `cid` for Resend delivery (Gmail-safe with attachments).
     * `data-uri` for `/email-preview` (default — browsers ignore cid:).
     */
    logoMode?: EmailLogoMode;
}

/**
 * Cool gray outer canvas + white card — mirrors app surfaces.
 */
const EmailLayout: React.FC<EmailLayoutProps> = ({
    children,
    darkMode = false,
    footerProps,
    headerProps,
    previewText,
    title,
    websiteUrl,
    logoMode = 'data-uri',
}) => {
    const theme = getTheme(darkMode);
    const chrome = {
        logoMode,
        ...(websiteUrl
            ? {
                  websiteUrl,
                  privacyUrl: `${websiteUrl.replace(/\/$/, '')}/legal/privacy`,
                  termsUrl: `${websiteUrl.replace(/\/$/, '')}/legal/terms`,
                  cookiesUrl: `${websiteUrl.replace(/\/$/, '')}/legal/cookies`,
              }
            : {}),
    };

    return (
        <Html>
            <Head>
                {title ? <title>{title}</title> : null}
                {/* Swap on-light / on-dark wordmark with the client color scheme. */}
                {!darkMode ? <style>{EMAIL_WORDMARK_THEME_CSS}</style> : null}
            </Head>
            {previewText ? <Preview>{previewText}</Preview> : null}
            <Body
                style={{
                    backgroundColor: darkMode ? emailBrand.canvasDark : emailBrand.canvas,
                    fontFamily: emailFonts.sans,
                    margin: '0 auto',
                    padding: emailLayout.outerPadding,
                    WebkitTextSizeAdjust: '100%',
                }}>
                <Container
                    style={{
                        backgroundColor: theme.colors.background,
                        border: `1px solid ${theme.colors.border}`,
                        borderRadius: emailRadii.md,
                        boxShadow: darkMode ? emailShadow.cardDark : emailShadow.cardLight,
                        margin: '0 auto',
                        maxWidth: emailLayout.maxWidth,
                        overflow: 'hidden',
                        padding: 0,
                    }}>
                    <EmailHeader {...chrome} {...headerProps} darkMode={darkMode} />
                    {children}
                    <EmailFooter {...chrome} {...footerProps} darkMode={darkMode} />
                </Container>
            </Body>
        </Html>
    );
};

export default EmailLayout;
