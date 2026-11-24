'use client';

import Link from 'next/link';

import { useTranslations } from '@rumtelo/i18n';
import { cn } from '@rumtelo/utils';

import { DIRECTION_PATH } from '@/app/_lib/nav';
import { useMyDirection } from '@/app/_lib/use-my-direction';

/**
 * One quiet line that shows the person's own direction back, with a link to its page.
 * Renders nothing without a direction, in a Practice preview, or while it loads. Read-only,
 * never a nudge: it appears where a decision is made (the end of the week check, the goals
 * lists) and says nothing else.
 */
export function DirectionLine({ className }: { className?: string }) {
    const t = useTranslations('features.soul.direction');
    const direction = useMyDirection();
    if (!direction) return null;
    return (
        <p
            className={cn(
                'flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 text-sm text-fg-muted',
                className
            )}>
            <span className="min-w-0 text-pretty [overflow-wrap:anywhere]">
                {t('line', { direction })}
            </span>
            <Link
                href={DIRECTION_PATH}
                className="inline-flex min-h-11 shrink-0 items-center rounded-md px-1 font-semibold text-accent underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                {t('line_open')}
            </Link>
        </p>
    );
}
