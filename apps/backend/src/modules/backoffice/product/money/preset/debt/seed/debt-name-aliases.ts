import { aliasesForPresetName } from '../../catalog-name-aliases';
import { DEBT_PRESET_SEED } from './debt.seed-data';
import { DEBT_PRESET_TRANSLATIONS } from './debt-translations';

/** EN + seeded translations for debt types (edit hydrate / lockPresets). */
export function aliasesForDebtPreset(key: string, displayName: string): string[] {
    const seed = DEBT_PRESET_SEED.find(row => row.key === key);
    return aliasesForPresetName(key, displayName, seed?.name, DEBT_PRESET_TRANSLATIONS);
}
