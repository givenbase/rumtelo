'use client';

import type { ReactNode } from 'react';

import type { CoachFeatureId } from '@rumtelo/contracts';

import { isCoachFeatureEnabled } from '@/app/_lib/coach-readiness';

import { HelperGate } from './helper-gate';

type CoachFeatureGateProps = {
    feature: CoachFeatureId;
    children: ReactNode;
    /** When the feature is off (env or helpers preference), render this instead. */
    fallback?: ReactNode;
};

/**
 * Gate a coach/helper surface by readiness (preview → staging/dev only) then
 * by the user's helpers preference.
 */
export function CoachFeatureGate({ feature, children, fallback = null }: CoachFeatureGateProps) {
    if (!isCoachFeatureEnabled(feature)) return <>{fallback}</>;
    return <HelperGate fallback={fallback}>{children}</HelperGate>;
}
