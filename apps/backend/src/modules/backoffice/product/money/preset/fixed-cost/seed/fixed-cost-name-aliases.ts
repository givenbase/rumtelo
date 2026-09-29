import { aliasesForPresetName } from '../../catalog-name-aliases';
import { FIXED_COST_PRESET_SEED } from './fixed-cost.seed-data';
import { FIXED_COST_PRESET_TRANSLATIONS } from './fixed-cost-translations';

/** EN + seeded translations for fixed-cost bill types (edit hydrate / lockPresets). */
export function aliasesForFixedCostPreset(key: string, displayName: string): string[] {
    const seed = FIXED_COST_PRESET_SEED.find(row => row.key === key);
    return aliasesForPresetName(key, displayName, seed?.name, FIXED_COST_PRESET_TRANSLATIONS);
}
