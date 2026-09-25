import { cn } from '@rumtelo/utils';

export type StagingEnvironmentBannerProps = {
    /** Short env mark, e.g. "Staging" */
    badge: string;
    /** Supporting line for testers */
    message: string;
    /** Accessible name for the region */
    ariaLabel: string;
    className?: string;
};

/**
 * Fixed top strip for non-production deploys.
 * Presentational — callers decide when to mount.
 */
export function StagingEnvironmentBanner({
    badge,
    message,
    ariaLabel,
    className,
}: StagingEnvironmentBannerProps) {
    return (
        <div
            role="status"
            aria-label={ariaLabel}
            className={cn(
                'pointer-events-none fixed inset-x-0 top-0 z-[60] animate-rise',
                className
            )}>
            <div className="relative overflow-hidden border-b border-white/10 bg-[#141a24]">
                {/* Soft brand wash — inline to avoid arbitrary-value parse issues */}
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                    style={{
                        backgroundImage:
                            'radial-gradient(120% 80% at 12% 0%, rgb(6 101 108 / 0.45), transparent 55%), radial-gradient(90% 70% at 88% 100%, rgb(154 78 8 / 0.28), transparent 50%)',
                    }}
                />
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-accent/50 to-transparent"
                />

                <div className="relative mx-auto flex h-10 max-w-7xl items-center justify-center gap-3 px-4">
                    <span className="inline-flex items-center gap-2 rounded-md border border-accent/35 bg-accent/15 px-2 py-0.5 font-mono text-[10px] font-semibold tracking-[0.18em] text-[#7fd4cf] uppercase">
                        <span aria-hidden className="relative flex size-1.5 shrink-0">
                            <span className="absolute inset-0 animate-ping rounded-full bg-accent opacity-60" />
                            <span className="relative size-1.5 rounded-full bg-accent" />
                        </span>
                        {badge}
                    </span>
                    <p className="truncate text-center text-xs font-medium tracking-wide text-white/80">
                        {message}
                    </p>
                </div>
            </div>
        </div>
    );
}
