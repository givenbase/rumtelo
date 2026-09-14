import { GROCERIES_MERCHANTS } from './by-category/groceries';
import { TRANSPORT_MERCHANTS } from './by-category/transport';
import { UTILITIES_MERCHANTS } from './by-category/utilities';
import { HOUSING_MERCHANTS } from './by-category/housing';
import { INSURANCE_MERCHANTS } from './by-category/insurance';
import { SUBSCRIPTIONS_MERCHANTS } from './by-category/subscriptions';
import { CARE_MERCHANTS } from './by-category/care';
import { PETS_MERCHANTS } from './by-category/pets';
import { BANKING_MERCHANTS } from './by-category/banking';
import { TAXES_MERCHANTS } from './by-category/taxes';
import { FINES_MERCHANTS } from './by-category/fines';
import { FAMILY_MERCHANTS } from './by-category/family';
import { FASHION_MERCHANTS } from './by-category/fashion';
import { SHOPPING_MERCHANTS } from './by-category/shopping';
import { BEAUTY_MERCHANTS } from './by-category/beauty';
import { TRAVEL_MERCHANTS } from './by-category/travel';
import { EVENTS_MERCHANTS } from './by-category/events';
import { GAMING_MERCHANTS } from './by-category/gaming';
import { MEDIA_MERCHANTS } from './by-category/media';
import { EATING_OUT_MERCHANTS } from './by-category/eating-out';
import { HOBBIES_MERCHANTS } from './by-category/hobbies';
import { SPORT_MERCHANTS } from './by-category/sport';
import { EDUCATION_MERCHANTS } from './by-category/education';
import { FREEDOM_MERCHANTS } from './by-category/freedom';
import { GIVE_MERCHANTS } from './by-category/give';
import type { MerchantSeed } from './types';

export type { MerchantSeed, MerchantHighlight } from './types';
export { necessities, play, education, give, financialFreedom, longTermSavings } from './types';

/** Full merchant catalog — concat order controls default sortOrder. */
export const MERCHANT_PRESET_SEED: readonly MerchantSeed[] = [
    ...GROCERIES_MERCHANTS,
    ...TRANSPORT_MERCHANTS,
    ...UTILITIES_MERCHANTS,
    ...HOUSING_MERCHANTS,
    ...INSURANCE_MERCHANTS,
    ...SUBSCRIPTIONS_MERCHANTS,
    ...CARE_MERCHANTS,
    ...PETS_MERCHANTS,
    ...BANKING_MERCHANTS,
    ...TAXES_MERCHANTS,
    ...FINES_MERCHANTS,
    ...FAMILY_MERCHANTS,
    ...FASHION_MERCHANTS,
    ...SHOPPING_MERCHANTS,
    ...BEAUTY_MERCHANTS,
    ...TRAVEL_MERCHANTS,
    ...EVENTS_MERCHANTS,
    ...GAMING_MERCHANTS,
    ...MEDIA_MERCHANTS,
    ...EATING_OUT_MERCHANTS,
    ...HOBBIES_MERCHANTS,
    ...SPORT_MERCHANTS,
    ...EDUCATION_MERCHANTS,
    ...FREEDOM_MERCHANTS,
    ...GIVE_MERCHANTS,
];
