import { GROUP_SOFT_CEILING, GROUP_SOFT_FLOOR, type JarKey } from '@rumtelo/contracts';

export type SplitTipSeverity = 'info' | 'warn';

export type SplitTip = {
    id: string;
    severity: SplitTipSeverity;
    /** Optional jar keys this tip reacts to. */
    jars?: JarKey[];
};

/** Share per pot the household has. A pot that is not in the map is absent (0 %), never a default. */
export type SplitPctByKey = Partial<Record<JarKey, number>>;

/** Group-level soft limits live in contracts so the server money coach uses the same numbers. */
export { GROUP_SOFT_CEILING, GROUP_SOFT_FLOOR };
