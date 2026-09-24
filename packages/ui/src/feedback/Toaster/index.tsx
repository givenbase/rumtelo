'use client';

import type { CSSProperties } from 'react';
import { useTheme } from 'next-themes';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

import { Icon } from '../../display/Icon';

const Toaster = ({ ...props }: ToasterProps) => {
    const { resolvedTheme } = useTheme();

    return (
        <Sonner
            theme={(resolvedTheme as ToasterProps['theme']) ?? 'system'}
            className="toaster group"
            icons={{
                success: <Icon name="circle-check" size="md" />,
                info: <Icon name="info" size="md" />,
                warning: <Icon name="triangle-alert" size="md" />,
                error: <Icon name="octagon-x" size="md" />,
                loading: <Icon name="loader-2" size="md" className="animate-spin" />,
            }}
            style={
                {
                    '--normal-bg': 'var(--popover)',
                    '--normal-text': 'var(--popover-foreground)',
                    '--normal-border': 'var(--border)',
                    '--border-radius': 'var(--radius)',
                } as CSSProperties
            }
            {...props}
        />
    );
};

export { Toaster };
