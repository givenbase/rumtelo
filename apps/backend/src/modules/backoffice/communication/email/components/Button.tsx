import { Button as ReactEmailButton } from '@react-email/components';

import * as React from 'react';

import { getButtonStyle } from '../styles/style-helpers';
import { emailRadii } from '../styles/email-tokens';

interface ButtonProps {
    align?: 'center' | 'left' | 'right';
    children: React.ReactNode;
    darkMode?: boolean;
    fullWidth?: boolean;
    href: string;
    size?: 'large' | 'medium' | 'small';
    variant?: 'outline' | 'primary' | 'secondary';
}

/** Solid teal CTA — Rumtelo tokens. */
const Button: React.FC<ButtonProps> = ({
    href,
    children,
    align = 'center',
    fullWidth = false,
    size = 'medium',
    darkMode = false,
    variant = 'primary',
}) => {
    const buttonStyle = {
        ...getButtonStyle(darkMode, size, variant),
        borderRadius: emailRadii.sm,
        width: fullWidth ? '100%' : undefined,
        boxSizing: 'border-box' as const,
    };

    return (
        <div style={{ margin: '20px 0 16px', textAlign: align }}>
            <ReactEmailButton href={href} style={buttonStyle}>
                {children}
            </ReactEmailButton>
        </div>
    );
};

export default Button;
