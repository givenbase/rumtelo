'use client';

import { useMemo } from 'react';

import { nextPlanForHigherLimit, type PlanKey, type PlanLimitKey } from '@/app/_lib/plan';
import { usePlanCapabilities } from '@/components/features/shell/use-plan-capabilities';

export type PlanCapacityState = {
    planReady: boolean;
    occupied: number;
    /** Plan ceiling — null = unlimited. */
    max: number | null;
    /** True while plan is loading, or occupied is still under the ceiling. */
    canAdd: boolean;
    /** Finite ceilings only (hide on Max-style unlimited). */
    showFraction: boolean;
    /** Next plan that raises this limit — null when already open or no higher tier. */
    upgradeTo: PlanKey | null;
};

/**
 * Client mirror of backend `assertWithinLimit` — callers own domain counting
 * (e.g. ACTIVE goals, linked bank seats). Pure plan math lives here once.
 */
export function usePlanCapacity(limitKey: PlanLimitKey, occupied: number): PlanCapacityState {
    const { plan, planReady, limitFor, withinLimit } = usePlanCapabilities();

    return useMemo(() => {
        const max = limitFor(limitKey);
        const underCeiling = withinLimit(limitKey, occupied);
        const canAdd = !planReady || underCeiling;
        const upgradeTo =
            planReady && !underCeiling ? nextPlanForHigherLimit(plan, limitKey) : null;

        return {
            planReady,
            occupied,
            max,
            canAdd,
            showFraction: planReady && max !== null,
            upgradeTo,
        };
    }, [plan, planReady, limitKey, occupied, limitFor, withinLimit]);
}
