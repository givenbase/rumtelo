import { minPlanForCapability, type PlanKey } from './plan';
import { routeAccessForPath } from './route-capabilities';

/** Resolve the plan-gating capability key for any app pathname (route table, not the nav). */
export function capabilityKeyForPathname(pathname: string): string | null {
    return routeAccessForPath(pathname)?.capabilityKey ?? null;
}

export interface CapabilityAccess {
    capabilityKey: string | null;
    locked: boolean;
    requiredPlan: PlanKey | null;
}

/** Evaluate whether the current path is allowed for `plan`. */
export function capabilityAccessForPath(
    pathname: string,
    plan: PlanKey,
    isLocked: (capabilityKey: string | null, plan: PlanKey) => boolean
): CapabilityAccess {
    const capabilityKey = capabilityKeyForPathname(pathname);
    const locked = isLocked(capabilityKey, plan);
    const requiredPlan = capabilityKey ? minPlanForCapability(capabilityKey) : null;
    return { capabilityKey, locked, requiredPlan };
}
