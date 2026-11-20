'use client';

import type { ReactNode } from 'react';

import { useTranslations } from '@rumtelo/i18n';
import { cn } from '@rumtelo/utils';

import { CoachMark } from './helper-mark';
import { useHelpersEnabled } from './provider';

type CoachTipTone = 'default' | 'warning';

type CoachTipCardProps = {
    /** Short all-caps style title (without ✦ — mark is separate). */
    title: string;
    children: ReactNode;
    /** Optional mono meta line under the body. */
    meta?: ReactNode;
    /** CTAs under the tip. */
    actions?: ReactNode;
    tone?: CoachTipTone;
    /**
     * One row on wide screens: title, one line of text and the CTAs side by side,
     * with a lighter frame. Same content and logic; used under lists so the list leads.
     */
    compact?: boolean;
    className?: string;
};

/**
 * Subliminal Coach guide card — same voice as jar guides / why-lines.
 * Hidden when Coach guides are off.
 */
export function CoachTipCard({
    title,
    children,
    meta,
    actions,
    tone = 'default',
    compact = false,
    className,
}: CoachTipCardProps) {
    const t = useTranslations('features.coach.helpers');
    const enabled = useHelpersEnabled();
    if (!enabled) return null;

    if (compact) {
        return (
            <div
                className={cn(
                    'flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border px-3 py-2.5',
                    tone === 'warning' ? 'border-warning bg-warning/5' : 'border-accent bg-surface',
                    className
                )}
                data-coach-guide="tip"
                aria-label={t('tip_aria', { title })}>
                <div className="flex shrink-0 items-center gap-2">
                    <CoachMark size="sm" />
                    <p
                        className={cn(
                            'font-mono text-[10px] font-bold tracking-[0.14em] uppercase',
                            tone === 'warning' ? 'text-warning' : 'text-accent'
                        )}>
                        {title}
                    </p>
                </div>
                <div className="min-w-0 flex-1 basis-56 text-sm leading-snug text-pretty text-fg-secondary">
                    {children}
                    {meta ? (
                        <span className="ml-1.5 font-mono text-xs text-fg-faint">{meta}</span>
                    ) : null}
                </div>
                {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
            </div>
        );
    }

    return (
        <div
            className={cn(
                'grid gap-3 rounded-2xl border p-4 shadow-sm lg:p-5',
                tone === 'warning'
                    ? 'border-warning bg-warning/5'
                    : 'border-accent bg-surface ring-1 ring-accent/15',
                className
            )}
            data-coach-guide="tip"
            aria-label={t('tip_aria', { title })}>
            <div className="flex flex-wrap items-center gap-2">
                <CoachMark size="sm" />
                <p
                    className={cn(
                        'font-mono text-[10px] font-bold tracking-[0.14em] uppercase',
                        tone === 'warning' ? 'text-warning' : 'text-accent'
                    )}>
                    {title}
                </p>
            </div>
            <div className="text-sm leading-relaxed text-pretty text-fg-secondary">{children}</div>
            {meta ? <div className="font-mono text-xs text-fg-faint">{meta}</div> : null}
            {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
    );
}
