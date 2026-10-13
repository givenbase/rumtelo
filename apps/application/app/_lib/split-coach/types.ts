import {
    DEFAULT_JAR_SPLIT,
    SpendingStyle,
    SPLIT_SOFT_CEILING,
    SPLIT_SOFT_FLOOR,
    type JarKey,
} from '@rumtelo/contracts';

export { SpendingStyle };

export type SplitTipSeverity = 'info' | 'warn';

export type SplitTip = {
    id: string;
    severity: SplitTipSeverity;
    /** Optional jar keys this tip reacts to. */
    jars?: JarKey[];
};

export type SplitPctByKey = Partial<Record<JarKey, number>>;

/** Soft floors/ceilings live in contracts so the server money coach uses the same numbers. */
export { DEFAULT_JAR_SPLIT, SPLIT_SOFT_CEILING, SPLIT_SOFT_FLOOR };
