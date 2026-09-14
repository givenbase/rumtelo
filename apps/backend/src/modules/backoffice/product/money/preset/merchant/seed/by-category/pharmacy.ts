import type { MerchantSeed } from '../types';
import { necessities } from '../types';

/** Pharmacy — apotheek / prescription retail */
export const PHARMACY_MERCHANTS: readonly MerchantSeed[] = [
    {
        key: 'APOTHEEK',
        name: 'Apotheek',
        matchValue: 'Apotheek',
        aliases: ['Apotheek', 'APOTHEEK', 'Service Apotheek'],
        mcc: '5912',
        jarKey: necessities,
        categoryTemplateKey: 'PHARMACY',
        logoDomain: 'apotheek.nl',
        website: 'https://apotheek.nl',
        highlight: null,
        markets: ['NL'],
        matchPriority: 0,
        isActive: true,
    },
    {
        key: 'MEDIQ',
        name: 'Mediq',
        matchValue: 'Mediq',
        aliases: ['Mediq', 'MEDIQ'],
        mcc: '5912',
        jarKey: necessities,
        categoryTemplateKey: 'PHARMACY',
        logoDomain: 'mediq.com',
        website: 'https://mediq.com',
        highlight: null,
        markets: ['NL'],
        matchPriority: 0,
        isActive: true,
    },
];
