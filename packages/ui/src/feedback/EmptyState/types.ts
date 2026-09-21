import type { ReactNode } from 'react';

interface EmptyStateProps {
    /** Emoji string, Lucide node, or any media. */
    icon?: ReactNode;
    title: string;
    body: string;
    action?: ReactNode;
    variant?: 'compact' | 'default' | 'large';
}

export type { EmptyStateProps };
export default EmptyStateProps;
