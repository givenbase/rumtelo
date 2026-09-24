import { JarKey, MerchantHighlight } from '@rumtelo/contracts';

export { MerchantHighlight };

export type MerchantSeed = {
    key: string;
    name: string;
    matchValue: string;
    aliases: string[];
    mcc: string | null;
    jarKey: JarKey;
    categoryTemplateKey: string;
    /**
     * When set, this merchant mirrors GivingOrganisation.key — bank matching only;
     * Coach catalog owns the editorial identity.
     */
    givingOrganisationKey?: string | null;
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
