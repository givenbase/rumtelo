import { DEFAULT_JAR_SPLIT, SpendingStyle, type JarKey } from '@rumtelo/contracts';

export { SpendingStyle };

export type SplitTipSeverity = 'info' | 'warn';

export type SplitTip = {
    id: string;
    severity: SplitTipSeverity;
    /** Optional jar keys this tip reacts to. */
    jars?: JarKey[];
};

export type SplitPctByKey = Partial<Record<JarKey, number>>;

/** Soft ceilings — going above these triggers a tip (defaults are the floor for FF/LTS). */
export const SPLIT_SOFT_CEILING: Record<JarKey, number> = {
    NECESSITIES: 60,
    FINANCIAL_FREEDOM: 100,
    LONG_TERM_SAVINGS: 100,
    EDUCATION: 12,
    PLAY: 10,
    GIVE: 5,
};

export const SPLIT_SOFT_FLOOR: Record<JarKey, number> = {
    NECESSITIES: 45,
    FINANCIAL_FREEDOM: 10,
    LONG_TERM_SAVINGS: 10,
    EDUCATION: 0,
    PLAY: 0,
    GIVE: 0,
};

export { DEFAULT_JAR_SPLIT };
