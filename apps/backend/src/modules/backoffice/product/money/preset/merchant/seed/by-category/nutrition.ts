import type { MerchantSeed } from '../types';
import { necessities } from '../types';

/** Nutrition — vitamins + sports nutrition (not Sport gear, not Pharmacy) */
export const NUTRITION_MERCHANTS: readonly MerchantSeed[] = [
    {
        key: 'HOLLAND_AND_BARRETT',
        name: 'Holland & Barrett',
        matchValue: 'Holland & Barrett',
        aliases: ['Holland & Barrett', 'Holland and Barrett', 'H&B '],
        mcc: '5499',
        jarKey: necessities,
        categoryTemplateKey: 'NUTRITION',
        logoDomain: 'hollandandbarrett.nl',
        website: 'https://hollandandbarrett.nl',
        highlight: null,
        markets: ['NL'],
        matchPriority: 0,
        isActive: true,
    },
    {
        key: 'BODY_AND_FIT',
        name: 'Body & Fit',
        matchValue: 'Body & Fit',
        aliases: ['Body & Fit', 'Body and Fit', 'BODYFIT'],
        mcc: '5499',
        jarKey: necessities,
        categoryTemplateKey: 'NUTRITION',
        logoDomain: 'bodyandfit.com',
        website: 'https://bodyandfit.com',
        highlight: null,
        markets: ['NL'],
        matchPriority: 0,
        isActive: true,
    },
];
