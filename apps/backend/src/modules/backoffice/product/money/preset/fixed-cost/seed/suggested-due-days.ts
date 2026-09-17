/**
 * Optional day-of-month hint (1–31) for fixed-cost bill presets.
 * Only set when a typical NL due day is well known.
 */
export const SUGGESTED_DUE_DAY_BY_PRESET: Readonly<Record<string, number>> = {
    RENT: 1,
    STUDENT_HOUSING: 1,
    ROOM_RENT: 1,
    MORTGAGE: 1,
    HOA_FEES: 1,
    ENERGY: 1,
    ELECTRICITY: 1,
    GAS: 1,
    WATER: 1,
    HEALTH_INSURANCE: 1,
    HEALTH_INSURANCE_SUPPLEMENT: 1,
    CAR_INSURANCE: 1,
    HOME_CONTENTS: 1,
    LIABILITY_INSURANCE: 1,
    INTERNET: 1,
    MOBILE_PHONE: 1,
    STREAMING_VIDEO: 1,
    STREAMING_MUSIC: 1,
    GYM: 1,
    STUDENT_LOAN_PAYMENT: 28,
    TRANSIT_PASS: 1,
    BANK_FEE: 1,
};
