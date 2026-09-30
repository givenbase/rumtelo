import { GROCERIES_MERCHANTS } from './by-category/groceries';
import { TRANSPORT_MERCHANTS } from './by-category/transport';
import { UTILITIES_MERCHANTS } from './by-category/utilities';
import { HOUSING_MERCHANTS } from './by-category/housing';
import { INSURANCE_MERCHANTS } from './by-category/insurance';
import { SUBSCRIPTIONS_MERCHANTS } from './by-category/subscriptions';
import { PHARMACY_MERCHANTS } from './by-category/pharmacy';
import { DRUGSTORE_MERCHANTS } from './by-category/drugstore';
import { NUTRITION_MERCHANTS } from './by-category/nutrition';
import { PETS_MERCHANTS } from './by-category/pets';
import { DENTAL_MERCHANTS } from './by-category/dental';
import { OPTICIAN_MERCHANTS } from './by-category/optician';
import { CLEANING_MERCHANTS } from './by-category/cleaning';
import { HOME_SERVICES_MERCHANTS } from './by-category/home-services';
import { BANKING_MERCHANTS } from './by-category/banking';
import { TAXES_MERCHANTS } from './by-category/taxes';
import { FINES_MERCHANTS } from './by-category/fines';
import { FAMILY_MERCHANTS } from './by-category/family';
import { CHILD_ACTIVITIES_MERCHANTS } from './by-category/child-activities';
import { FASHION_MERCHANTS } from './by-category/fashion';
import { SHOPPING_MERCHANTS } from './by-category/shopping';
import { ELECTRONICS_MERCHANTS } from './by-category/electronics';
import { ALCOHOL_MERCHANTS } from './by-category/alcohol';
import { BEAUTY_MERCHANTS } from './by-category/beauty';
import { SPA_MERCHANTS } from './by-category/spa';
import { BARS_MERCHANTS } from './by-category/bars';
import { TATTOO_MERCHANTS } from './by-category/tattoo';
import { FLOWERS_MERCHANTS } from './by-category/flowers';
import { POST_MERCHANTS } from './by-category/post';
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

export type { MerchantSeed } from './types';
export { MerchantHighlight } from './types';
export { necessities, play, education, give, financialFreedom, longTermSavings } from './types';

/** Full merchant catalog — concat order controls default sortOrder. */
export const MERCHANT_PRESET_SEED: readonly MerchantSeed[] = [
    ...GROCERIES_MERCHANTS,
    ...TRANSPORT_MERCHANTS,
    ...UTILITIES_MERCHANTS,
    ...HOUSING_MERCHANTS,
    ...INSURANCE_MERCHANTS,
    ...SUBSCRIPTIONS_MERCHANTS,
    ...PHARMACY_MERCHANTS,
    ...DRUGSTORE_MERCHANTS,
    ...NUTRITION_MERCHANTS,
    ...PETS_MERCHANTS,
    ...DENTAL_MERCHANTS,
    ...OPTICIAN_MERCHANTS,
    ...CLEANING_MERCHANTS,
    ...HOME_SERVICES_MERCHANTS,
    ...BANKING_MERCHANTS,
    ...TAXES_MERCHANTS,
    ...FINES_MERCHANTS,
    ...FAMILY_MERCHANTS,
    ...CHILD_ACTIVITIES_MERCHANTS,
    ...FASHION_MERCHANTS,
    ...SHOPPING_MERCHANTS,
    ...ELECTRONICS_MERCHANTS,
    ...ALCOHOL_MERCHANTS,
    ...BEAUTY_MERCHANTS,
    ...SPA_MERCHANTS,
    ...BARS_MERCHANTS,
    ...TATTOO_MERCHANTS,
    ...FLOWERS_MERCHANTS,
    ...POST_MERCHANTS,
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
