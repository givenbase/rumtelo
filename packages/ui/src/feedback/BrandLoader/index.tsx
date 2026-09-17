import { cn } from '../../lib/utils';
import { Typography, typographyVariants } from '../../display/Typography';
import type { BrandLoaderProps } from './types';

/**
 * Branded boot / Suspense loader — use instead of blank fallsbacks or plan-lock flashes.
 */
export function BrandLoader({
    label = 'Loading',
    fullScreen = false,
    className,
}: BrandLoaderProps) {
    return (
        <div
            role="status"
            aria-live="polite"
            aria-busy="true"
            className={cn(
                'flex flex-col items-center justify-center gap-5 px-6 py-16 text-center',
                fullScreen
                    ? 'min-h-dvh bg-bg bg-(image:--gradient-page)'
                    : 'min-h-[min(24rem,60dvh)] w-full',
                className
            )}>
            <div className="relative grid size-16 place-items-center">
                <span
                    className="absolute inset-0 animate-brand-spin rounded-full border-2 border-accent/20 border-t-accent"
                    aria-hidden
                />
                <span
                    className={cn(
                        typographyVariants({ as: 'h3', weight: 'semibold', color: 'primary' }),
                        'animate-brand-breathe'
                    )}
                    aria-hidden>
                    ✦
                </span>
            </div>
            <div className="grid gap-1">
                <Typography as="h4" weight="semibold">
                    Rumtelo
                </Typography>
                <Typography as="p" variant="eyebrow" color="muted">
                    {label}
                </Typography>
            </div>
            <span className="sr-only">{label}</span>
        </div>
    );
}

export type { BrandLoaderProps };
