import type { ReactNode } from 'react';

import type { IconName } from '../../display/Icon/types';

interface EmptyStateProps {
    /** Lucide kebab or `custom/<id>` — rendered via shared Icon. */
    icon?: IconName;
    title: string;
    /** Optional supporting line — omit for compact single-line empties. */
    body?: string;
    action?: ReactNode;
    variant?: 'compact' | 'default' | 'large';
    className?: string;
}

export type { EmptyStateProps };
export default EmptyStateProps;
