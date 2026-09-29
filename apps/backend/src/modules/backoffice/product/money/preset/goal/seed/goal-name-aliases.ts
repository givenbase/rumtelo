import { aliasesForPresetName } from '../../catalog-name-aliases';
import { GOAL_PRESET_SEED } from './goal.seed-data';
import { GOAL_PRESET_TRANSLATIONS } from './goal-translations';

/** EN + seeded translations for goal types (edit hydrate / lockPresets). */
export function aliasesForGoalPreset(key: string, displayName: string): string[] {
    const seed = GOAL_PRESET_SEED.find(row => row.key === key);
    return aliasesForPresetName(key, displayName, seed?.name, GOAL_PRESET_TRANSLATIONS);
}
