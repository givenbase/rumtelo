import { type CSSProperties } from 'react';

import { emailFonts, emailLayout } from './email-tokens';

export interface EmailBaseStyles {
    container: CSSProperties;
    heading: CSSProperties;
    noteText: CSSProperties;
    section: CSSProperties;
    smallText: CSSProperties;
    spacing: { lg: string; md: string; sm: string; xl: string; xs: string };
    subheading: CSSProperties;
    text: CSSProperties;
}

export const baseStyles: EmailBaseStyles = {
    heading: {
        fontSize: '24px',
        fontWeight: 600,
        textAlign: 'left',
        margin: '24px 0 16px',
        padding: `0 ${emailLayout.contentInset}`,
        fontFamily: emailFonts.display,
        letterSpacing: '-0.02em',
        lineHeight: '1.3',
    },
    subheading: {
        fontSize: '11px',
        fontWeight: 600,
        textAlign: 'left',
        margin: '24px 0 12px',
        fontFamily: emailFonts.sans,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
    },
    text: {
        fontSize: '16px',
        lineHeight: '26px',
        margin: '0 0 14px',
        fontFamily: emailFonts.sans,
        textAlign: 'left',
    },
    noteText: {
        fontSize: '14px',
        lineHeight: '22px',
        margin: '0 0 12px',
        fontFamily: emailFonts.sans,
        textAlign: 'left',
    },
    smallText: {
        fontSize: '13px',
        lineHeight: '20px',
        margin: '0 0 8px',
        fontFamily: emailFonts.sans,
        textAlign: 'left',
    },
    section: {
        padding: `8px ${emailLayout.contentInset} 28px`,
        textAlign: 'left',
    },
    container: {
        margin: '0 auto',
        maxWidth: emailLayout.maxWidth,
    },
    spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
    },
};
