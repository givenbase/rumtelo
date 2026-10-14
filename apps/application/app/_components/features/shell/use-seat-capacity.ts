'use client';

import { useMemo } from 'react';

import {
    effectiveSeatCaps,
    nextPlanForHigherLimit,
    type PlanKey,
    type EffectiveSeatCaps,
} from '@/app/_lib/plan';

export type SeatOccupation = {
    occupiedSeats: number;
    writableCount: number;
    viewerCount: number;
    extras?: { extraContributor?: number; extraViewer?: number };
};

export type SeatCapacityState = {
    caps: EffectiveSeatCaps;
    occupiedSeats: number;
    writableCount: number;
    viewerCount: number;
    /** Total seats at or over the effective ceiling. */
    totalFull: boolean;
    /** Next plan that raises included `maxMembers` (ignores add-on purchases). */
    upgradeTo: PlanKey | null;
};

/**
 * Household seat capacity — special path (writable / viewer matrix + add-ons).
 * Not interchangeable with {@link usePlanCapacity}; backend uses `effectiveSeatCaps`.
 */
export function useSeatCapacity(plan: PlanKey, occupation: SeatOccupation): SeatCapacityState {
    const { occupiedSeats, writableCount, viewerCount, extras } = occupation;
    const extraContributor = extras?.extraContributor ?? 0;
    const extraViewer = extras?.extraViewer ?? 0;

    return useMemo(() => {
        const caps = effectiveSeatCaps(plan, { extraContributor, extraViewer });
        return {
            caps,
            occupiedSeats,
            writableCount,
            viewerCount,
            totalFull: caps.maxMembers !== null && occupiedSeats >= caps.maxMembers,
            upgradeTo: nextPlanForHigherLimit(plan, 'maxMembers'),
        };
    }, [plan, occupiedSeats, writableCount, viewerCount, extraContributor, extraViewer]);
}
