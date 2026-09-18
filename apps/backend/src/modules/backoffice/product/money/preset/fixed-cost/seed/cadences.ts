import { Cadence } from '@rumtelo/contracts';

/**
 * Billing cadence per fixed-cost preset when it is **not** monthly.
 * Everything absent here is Cadence.MONTHLY (the entity default).
 * Only list bills whose NL cadence is unambiguous.
 */
export const CADENCE_BY_PRESET: Readonly<Record<string, Cadence>> = {
    // Motorrijtuigenbelasting is assessed per quarter.
    ROAD_TAX: Cadence.QUARTERLY,
    // One assessment per year (instalments are a payment choice, not the bill's cadence).
    MUNICIPAL_TAX: Cadence.YEARLY,
    PROPERTY_TAX: Cadence.YEARLY,
    WATER_BOARD_TAX: Cadence.YEARLY,
    WASTE_TAX: Cadence.YEARLY,
    PARKING_PERMIT: Cadence.YEARLY,
    STUDENT_UNION: Cadence.YEARLY,
    TV_LICENSE: Cadence.YEARLY,
};
