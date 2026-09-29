import { aliasesForPresetName } from '../../catalog-name-aliases';
import { INCOME_SOURCE_PRESET_SEED } from './income.seed-data';
import { INCOME_SOURCE_PRESET_TRANSLATIONS } from './income-translations';

/** EN + seeded translations for income source types (edit hydrate / lockPresets). */
export function aliasesForIncomeSourcePreset(key: string, displayName: string): string[] {
    const seed = INCOME_SOURCE_PRESET_SEED.find(row => row.key === key);
    return aliasesForPresetName(key, displayName, seed?.name, INCOME_SOURCE_PRESET_TRANSLATIONS);
}
