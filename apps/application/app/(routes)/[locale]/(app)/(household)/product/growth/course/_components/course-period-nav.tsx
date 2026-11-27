'use client';

import Link from 'next/link';

import { Icon } from '@rumtelo/ui';

/** ‹ › and the period label, plus a way back to now. One per tab. */
export function CoursePeriodNav({
    label,
    prevHref,
    nextHref,
    prevLabel,
    nextLabel,
    nowHref,
    nowLabel,
}: {
    label: string;
    prevHref: string;
    nextHref: string;
    prevLabel: string;
    nextLabel: string;
    /** Null when already on now. */
    nowHref: string | null;
    nowLabel: string;
}) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            <Link
                href={prevHref}
                aria-label={prevLabel}
                className="grid size-10 place-items-center rounded-full border border-line bg-card text-fg hover:bg-raised">
                <Icon name="chevron-left" aria-hidden />
            </Link>
            <Link
                href={nextHref}
                aria-label={nextLabel}
                className="grid size-10 place-items-center rounded-full border border-line bg-card text-fg hover:bg-raised">
                <Icon name="chevron-right" aria-hidden />
            </Link>
            <span className="font-mono text-xs tracking-wide text-fg uppercase">{label}</span>
            {nowHref ? (
                <Link
                    href={nowHref}
                    className="rounded-full px-2.5 py-1 font-mono text-[11px] tracking-wide text-accent uppercase hover:bg-accent-soft">
                    {nowLabel}
                </Link>
            ) : null}
        </div>
    );
}
