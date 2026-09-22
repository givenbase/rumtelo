/** Compact duration labels — hours/minutes chips, band ranges (energy week, coach). */
const duration = {
    hours_only: '{hours}h',
    minutes_only: '{minutes}m',
    hours_minutes: '{hours}h {minutes}m',
    band_hours: '{hours}h',
    band_hours_decimal: '{hours}h',
    band_between: '{low}–{high}',
    band_at_least: '≥ {value}',
    band_at_most: '≤ {value}',
} as const;

export default duration;
