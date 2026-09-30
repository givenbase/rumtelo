import type { MerchantSeed } from '../types';
import { necessities } from '../types';

/**
 * Kids activities — zwemles, muziek, sportles (not daycare; that stays FAMILY).
 * Local clubs are free-typed.
 */
export const CHILD_ACTIVITIES_MERCHANTS: readonly MerchantSeed[] = [
    {
        key: 'ZWEMLESSEN_NL',
        name: 'Zwemles.nl',
        matchValue: 'Zwemles',
        aliases: ['Zwemles.nl', 'Zwemles', 'ZWEMLES'],
        mcc: '7997',
        jarKey: necessities,
        categoryTemplateKey: 'CHILD_ACTIVITIES',
        logoDomain: 'zwemles.nl',
        website: 'https://zwemles.nl',
        highlight: null,
        markets: ['NL'],
        matchPriority: 0,
        isActive: true,
    },
    {
        key: 'MUSIC_SCHOOL',
        name: 'Muziekschool',
        matchValue: 'Muziekschool',
        aliases: ['Muziekschool', 'Muziek School', 'MUZIEKSCHOOL'],
        mcc: '8299',
        jarKey: necessities,
        categoryTemplateKey: 'CHILD_ACTIVITIES',
        logoDomain: null,
        website: null,
        highlight: null,
        markets: ['NL'],
        matchPriority: 0,
        isActive: true,
    },
    {
        key: 'SCOUTING',
        name: 'Scouting',
        matchValue: 'Scouting',
        aliases: ['Scouting', 'Scouting Nederland', 'SCOUTING'],
        mcc: '8641',
        jarKey: necessities,
        categoryTemplateKey: 'CHILD_ACTIVITIES',
        logoDomain: 'scouting.nl',
        website: 'https://scouting.nl',
        highlight: null,
        markets: ['NL'],
        matchPriority: 0,
        isActive: true,
    },
    {
        key: 'KNVB',
        name: 'KNVB',
        matchValue: 'KNVB',
        aliases: ['KNVB', 'KNVB Club', 'Voetbalvereniging'],
        mcc: '7941',
        jarKey: necessities,
        categoryTemplateKey: 'CHILD_ACTIVITIES',
        logoDomain: 'knvb.nl',
        website: 'https://knvb.nl',
        highlight: null,
        markets: ['NL'],
        matchPriority: 0,
        isActive: true,
    },
];
