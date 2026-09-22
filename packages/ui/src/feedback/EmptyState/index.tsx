'use client';

import * as React from 'react';

import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@rumtelo/utils';

import type EmptyStateProps from './types';

const emptyVariants = cva(
    'flex flex-col items-center justify-center gap-4 rounded-lg border border-line bg-surface text-center',
    {
        variants: {
            variant: {
                compact: 'min-h-0 gap-3 px-5 py-6',
                default: 'min-h-[15rem] px-6 py-12',
                large: 'min-h-[20rem] px-6 py-14',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    }
);

type EmptyProps = React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof emptyVariants>;

const Empty = React.forwardRef<HTMLDivElement, EmptyProps>(
    ({ className, variant, ...props }, ref) => (
        <div ref={ref} className={cn(emptyVariants({ variant }), className)} {...props} />
    )
);
Empty.displayName = 'Empty';

const EmptyHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={cn('flex flex-col items-center gap-2.5', className)} {...props} />
    )
);
EmptyHeader.displayName = 'EmptyHeader';

const emptyMediaVariants = cva('flex shrink-0 items-center justify-center', {
    variants: {
        variant: {
            icon: 'size-11 rounded-lg border border-line bg-raised text-2xl text-fg-muted',
            illustration: 'h-48 w-48',
            image: 'h-32 w-32',
        },
    },
    defaultVariants: {
        variant: 'icon',
    },
});

type EmptyMediaProps = React.HTMLAttributes<HTMLDivElement> &
    VariantProps<typeof emptyMediaVariants>;

const EmptyMedia = React.forwardRef<HTMLDivElement, EmptyMediaProps>(
    ({ className, variant, ...props }, ref) => (
        <div ref={ref} className={cn(emptyMediaVariants({ variant }), className)} {...props} />
    )
);
EmptyMedia.displayName = 'EmptyMedia';

const EmptyTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
    ({ className, children, ...props }, ref) => (
        <h3
            ref={ref}
            className={cn('max-w-md text-base font-semibold text-fg', className)}
            {...props}>
            {children}
        </h3>
    )
);
EmptyTitle.displayName = 'EmptyTitle';

const EmptyDescription = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
    <p
        ref={ref}
        className={cn('max-w-sm text-sm leading-relaxed text-fg-muted', className)}
        {...props}
    />
));
EmptyDescription.displayName = 'EmptyDescription';

const EmptyContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={cn('flex flex-col items-center gap-2', className)} {...props} />
    )
);
EmptyContent.displayName = 'EmptyContent';

/**
 * Convenience empty panel — prefer compound {@link Empty} pieces for custom layouts.
 */
export function EmptyState({
    icon,
    title,
    body,
    action,
    variant = 'default',
    className,
}: EmptyStateProps) {
    return (
        <Empty variant={variant} className={className}>
            <EmptyHeader>
                {icon ? <EmptyMedia>{icon}</EmptyMedia> : null}
                <EmptyTitle>{title}</EmptyTitle>
                {body ? <EmptyDescription>{body}</EmptyDescription> : null}
            </EmptyHeader>
            {action ? <EmptyContent>{action}</EmptyContent> : null}
        </Empty>
    );
}

export {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
    emptyVariants,
};

export type { EmptyStateProps, EmptyProps };
