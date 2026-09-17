/**
 * Lifestyle audiences for the fixed-cost bill picker.
 * isBaseline = not a chip; those bills stay listed under every other audience.
 *
 * Add a row here (then seed) to grow the vocabulary — do not add a TS enum.
 */
export const AUDIENCE_SEED = [
    {
        key: 'COMMON',
        name: 'Everyone',
        description: 'Bills most households share regardless of lifestyle.',
        isBaseline: true,
        icon: null,
        accentColor: 'var(--color-fg-secondary)',
        softColor: 'var(--color-raised)',
    },
    {
        key: 'STUDENT',
        name: 'Student',
        description: 'Housing, transit, tuition and study-life bills.',
        isBaseline: false,
        icon: '🎓',
        accentColor: 'var(--color-jar-edu)',
        softColor: 'color-mix(in oklab, var(--color-jar-edu) 14%, transparent)',
    },
    {
        key: 'RENTER',
        name: 'Renter',
        description: 'Rent, deposits and landlord-side housing costs.',
        isBaseline: false,
        icon: '🔑',
        accentColor: 'var(--color-jar-nec)',
        softColor: 'color-mix(in oklab, var(--color-jar-nec) 14%, transparent)',
    },
    {
        key: 'HOMEOWNER',
        name: 'Homeowner',
        description: 'Mortgage, HOA, property tax and home insurance.',
        isBaseline: false,
        icon: '🏠',
        accentColor: 'var(--color-jar-lts)',
        softColor: 'color-mix(in oklab, var(--color-jar-lts) 14%, transparent)',
    },
    {
        key: 'FAMILY',
        name: 'Family',
        description: 'Childcare, school and household care costs.',
        isBaseline: false,
        icon: '👪',
        accentColor: 'var(--color-accent)',
        softColor: 'var(--color-accent-soft)',
    },
    {
        key: 'COUPLE',
        name: 'Couple',
        description: 'Shared bills that show up more with a partner.',
        isBaseline: false,
        icon: '🤝',
        accentColor: 'var(--color-accent)',
        softColor: 'var(--color-accent-soft)',
    },
    {
        key: 'SINGLE',
        name: 'Single',
        description: 'Solo living costs without partner or kids.',
        isBaseline: false,
        icon: '👤',
        accentColor: 'var(--color-fg-secondary)',
        softColor: 'var(--color-raised)',
    },
    {
        key: 'CAR_OWNER',
        name: 'Car owner',
        description: 'Lease, fuel, parking, road tax and car insurance.',
        isBaseline: false,
        icon: '🚗',
        accentColor: 'var(--color-jar-play)',
        softColor: 'color-mix(in oklab, var(--color-jar-play) 14%, transparent)',
    },
    {
        key: 'PET_OWNER',
        name: 'Pet owner',
        description: 'Food plans, vet memberships and pet insurance.',
        isBaseline: false,
        icon: '🐾',
        accentColor: 'var(--color-jar-play)',
        softColor: 'color-mix(in oklab, var(--color-jar-play) 14%, transparent)',
    },
    {
        key: 'ELDERLY',
        name: 'Care',
        description: 'Home care, medical alarms and care contributions.',
        isBaseline: false,
        icon: '🩺',
        accentColor: 'var(--color-jar-nec)',
        softColor: 'color-mix(in oklab, var(--color-jar-nec) 14%, transparent)',
    },
] as const;

/** Seed keys for FixedCostPreset.audienceKeys — must match AUDIENCE_SEED.key. */
export const AudienceKey = Object.fromEntries(AUDIENCE_SEED.map(row => [row.key, row.key])) as {
    [K in (typeof AUDIENCE_SEED)[number]['key']]: K;
};
