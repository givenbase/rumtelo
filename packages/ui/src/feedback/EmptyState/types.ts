import type { ReactNode } from 'react';

interface EmptyStateProps {
    /** Emoji string, Lucide node, or any media. */
    icon?: ReactNode;
    title: string;
    /** Optional supporting line — omit for compact single-line empties. */
    body?: string;
    action?: ReactNode;
    variant?: 'compact' | 'default' | 'large';
    className?: string;
}

export type { EmptyStateProps };
export default EmptyStateProps;
