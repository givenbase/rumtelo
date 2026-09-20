/**
 * Time Utils (Energy)
 * Pure band arithmetic shared by the Nest summary and the UI. No I/O.
 */

import { TimeBandStatus } from '../enums';
import type { TimeBand } from './time.schema';

/**
 * Bands are weekly. Daily behaviours are compared against the proportional share so
 * three logged days are not judged as a short week. Weekly accumulators are returned
 * unchanged — they are only meaningful on a full week (see {@link bandStatus}).
 */
export function scaleBand(band: TimeBand, daysLogged: number): TimeBand {
    if (!band.perDay) return band;
    const factor = Math.min(7, Math.max(0, daysLogged)) / 7;
    const scale = (value: number | null) => (value === null ? null : Math.round(value * factor));
    return {
        ...band,
        floor: scale(band.floor),
        targetLow: scale(band.targetLow),
        targetHigh: scale(band.targetHigh),
        ceiling: scale(band.ceiling),
    };
}

/** Hard lines first (floor / ceiling), then the target range, else on target. */
export function bandStatus(
    minutes: number,
    band: TimeBand | null,
    daysLogged: number
): TimeBandStatus {
    if (daysLogged <= 0) return TimeBandStatus.NO_DATA;
    if (!band) return TimeBandStatus.NO_DATA;
    if (!band.perDay && daysLogged < 7) return TimeBandStatus.INCOMPLETE_WEEK;
    const scaled = scaleBand(band, daysLogged);
    if (scaled.floor !== null && minutes < scaled.floor) return TimeBandStatus.BELOW_FLOOR;
    if (scaled.ceiling !== null && minutes > scaled.ceiling) return TimeBandStatus.ABOVE_CEILING;
    if (scaled.targetLow !== null && minutes < scaled.targetLow) {
        return TimeBandStatus.BELOW_TARGET;
    }
    if (scaled.targetHigh !== null && minutes > scaled.targetHigh) {
        return TimeBandStatus.ABOVE_TARGET;
    }
    return TimeBandStatus.ON_TARGET;
}
