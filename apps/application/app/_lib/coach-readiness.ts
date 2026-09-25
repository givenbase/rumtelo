/**
 * Coach feature readiness for the app (preview coaches off when NODE_ENV=production).
 * Mirrors launch-products deferral.
 */
import {
    isCoachFeatureEnabledAtLaunch,
    shouldDeferPreviewCoaches,
    type CoachFeatureId,
} from '@rumtelo/contracts';

function coachEnvOpts() {
    return { nodeEnv: process.env.NODE_ENV };
}

/** True when preview coaches should be hidden. */
export function isPreviewCoachesDeferred(): boolean {
    return shouldDeferPreviewCoaches(coachEnvOpts());
}

/** Env gate for a coach/helper surface — helpers preference is separate. */
export function isCoachFeatureEnabled(id: CoachFeatureId): boolean {
    return isCoachFeatureEnabledAtLaunch(id, coachEnvOpts());
}
