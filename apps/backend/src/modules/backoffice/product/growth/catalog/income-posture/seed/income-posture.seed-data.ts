import { INCOME_POSTURE_KEYS } from '@rumtelo/contracts';

/** Seed rows for backoffice.reference_growth_income_posture. */
export const INCOME_POSTURE_SEED = [
    {
        key: INCOME_POSTURE_KEYS.UNKNOWN,
        name: 'Not sure yet',
        description: 'Still mapping how income arrives — show a broad set of methods.',
    },
    {
        key: INCOME_POSTURE_KEYS.TIME_TRADE,
        name: 'Time for money',
        description: 'Salary-like or hourly trade — income scales with hours worked.',
    },
    {
        key: INCOME_POSTURE_KEYS.SKILL_TRADE,
        name: 'Skill for money',
        description: 'Freelance, consulting, or services billed on expertise.',
    },
    {
        key: INCOME_POSTURE_KEYS.SYSTEM,
        name: 'Scalable system',
        description: 'A repeatable offer or business that can grow beyond your hours.',
    },
    {
        key: INCOME_POSTURE_KEYS.ASSETS,
        name: 'Asset returns',
        description: 'Portfolio and holdings that earn while you sleep.',
    },
] as const;
