import type { ReactNode } from 'react';

import { cn } from '@rumtelo/utils';

import { RegisterPageContentWidth } from '@/components/layout/page-content-width';

/** Shared max-widths — always paired with mx-auto so narrow pages center in the shell. */
export const PAGE_CONTENT_WIDTH = {
    /** Week check, gratitude, intent, settings forms (~672px) */
    narrow: 'max-w-2xl',
    /** Why, chakra (~768px) */
    prose: 'max-w-3xl',
    /** Default content column (~896px) */
    default: 'max-w-4xl',
    /** Wide dashboards with side panels (~1152px) */
    wide: 'max-w-6xl',
    /** Full shell width (1240px cap lives on HouseholdShell) */
    full: 'max-w-none',
} as const;

export type PageContentWidth = keyof typeof PAGE_CONTENT_WIDTH;

/**
 * Centers page content within the shell. Use `narrow` for wizard/form flows;
 * omit or use `full` for dashboard-style wide layouts.
 *
 * Also registers the width so WhyCaption (shell) can match the same column.
 */
export function PageContent({
    children,
    width = 'full',
    className,
}: {
    children: ReactNode;
    width?: PageContentWidth;
    className?: string;
}) {
    return (
        <>
            <RegisterPageContentWidth width={width} />
            <div className={cn('mx-auto w-full', PAGE_CONTENT_WIDTH[width], className)}>
                {children}
            </div>
        </>
    );
}
