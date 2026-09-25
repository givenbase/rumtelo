'use client';

import type { ReactNode } from 'react';

import type { CoachFeatureId } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';
import { cn } from '@rumtelo/utils';

import { isCoachFeatureEnabled } from '@/app/_lib/coach-readiness';

import { HelperGate } from './helper-gate';
import { CoachMark } from './helper-mark';

type CoachGuideSurfaceProps = {
    children: ReactNode;
    /** Accessible name for this coach guide. */
    label?: string;
    className?: string;
    /** Show the Coach badge (default true). */
    showMark?: boolean;
    markSize?: 'sm' | 'md';
    /**
     * Optional readiness id — when set, preview features hide in production
     * before the helpers preference gate.
     */
    feature?: CoachFeatureId;
};

/**
 * Wrap on-screen Coach guides: gated by readiness (optional) + preference + Coach mark.
 * Tip inbox still lives at /product/coach — this is the in-context coaching layer.
 */
export function CoachGuideSurface({
    children,
    label,
    className,
    showMark = true,
    markSize = 'md',
    feature,
}: CoachGuideSurfaceProps) {
    const t = useTranslations('features.coach');
    const resolvedLabel = label ?? t('helpers.mark_label');

    if (feature && !isCoachFeatureEnabled(feature)) return null;

    return (
        <HelperGate>
            <div
                className={cn('relative', className)}
                data-feature-helper
                data-coach-guide
                data-coach-feature={feature}
                aria-label={resolvedLabel}>
                {showMark ? (
                    <div className="mb-2 flex items-center gap-2">
                        <CoachMark size={markSize} />
                    </div>
                ) : null}
                {children}
            </div>
        </HelperGate>
    );
}
