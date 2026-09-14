import type { MerchantHighlight } from '@rumtelo/contracts';
import { JarKey } from '@rumtelo/contracts';

export type { MerchantHighlight };

export type MerchantSeed = {
    key: string;
    name: string;
    matchValue: string;
    aliases: string[];
    mcc: string | null;
    jarKey: JarKey;
    categoryTemplateKey: string;
    logoDomain: string | null;
    website?: string | null;
    highlight?: MerchantHighlight | null;
    markets?: string[];
    matchPriority?: number;
    providerIds?: Record<string, string>;
    isActive?: boolean;
};

export const necessities = JarKey.NECESSITIES;
export const play = JarKey.PLAY;
export const education = JarKey.EDUCATION;
export const give = JarKey.GIVE;
export const financialFreedom = JarKey.FINANCIAL_FREEDOM;
export const longTermSavings = JarKey.LONG_TERM_SAVINGS;
