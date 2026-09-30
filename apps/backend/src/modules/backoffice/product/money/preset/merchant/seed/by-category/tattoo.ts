import type { MerchantSeed } from '../types';
import { play } from '../types';

/** Tattoo & piercing — mostly free-typed locals; a few platforms. */
export const TATTOO_MERCHANTS: readonly MerchantSeed[] = [
    {
        key: 'TATTOODO',
        name: 'Tattoodo',
        matchValue: 'Tattoodo',
        aliases: ['Tattoodo', 'TATTOODO'],
        mcc: '7299',
        jarKey: play,
        categoryTemplateKey: 'TATTOO',
        logoDomain: 'tattoodo.com',
        website: 'https://tattoodo.com',
        highlight: null,
        markets: ['NL'],
        matchPriority: 0,
        isActive: true,
    },
];
