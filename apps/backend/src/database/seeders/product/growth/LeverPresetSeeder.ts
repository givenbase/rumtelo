import type { EntityManager } from '@mikro-orm/postgresql';

import { Seeder } from '@mikro-orm/seeder';

import { IncomePosture } from '../../../../modules/backoffice/product/growth/catalog/income-posture/income-posture.entity';
import { WealthStage } from '../../../../modules/backoffice/product/growth/catalog/wealth-stage/wealth-stage.entity';
import { LeverPreset } from '../../../../modules/backoffice/product/growth/preset/lever/lever.entity';
import { LEVER_PRESET_SEED } from '../../../../modules/backoffice/product/growth/preset/lever/seed/lever.seed-data';

/**
 * Seeds backoffice.reference_growth_lever_preset + its posture N:M.
 * Requires IncomePosture and WealthStage seeded first.
 */
export class LeverPresetSeeder extends Seeder {
    async run(em: EntityManager): Promise<void> {
        const postures = await em.find(IncomePosture, {});
        const stages = await em.find(WealthStage, {});
        const postureByKey = new Map(postures.map(row => [row.key, row]));
        const stageByKey = new Map(stages.map(row => [row.key, row]));
        const requirePosture = (key: string) => {
            const row = postureByKey.get(key);
            if (!row) throw new Error(`LeverPresetSeeder: unknown IncomePosture key "${key}"`);
            return row;
        };
        const requireStage = (key: string) => {
            const row = stageByKey.get(key);
            if (!row) throw new Error(`LeverPresetSeeder: unknown WealthStage key "${key}"`);
            return row;
        };

        const keys = LEVER_PRESET_SEED.map(row => row.key);
        const existingRows = await em.find(
            LeverPreset,
            { key: { $in: keys } },
            { populate: ['postures'] }
        );
        const existingByKey = new Map(existingRows.map(row => [row.key, row]));

        for (const [sortOrder, row] of LEVER_PRESET_SEED.entries()) {
            const minWealthStage = requireStage(row.minWealthStageKey);
            const postures = row.postureKeys.map(requirePosture);
            const existing = existingByKey.get(row.key);
            if (existing) {
                existing.name = row.name;
                existing.description = row.description;
                existing.accentColor = row.accentColor;
                existing.spendingStyles = [...row.spendingStyles];
                existing.minWealthStage = minWealthStage;
                existing.sortOrder = sortOrder;
                existing.isActive = true;
            }
            const preset: LeverPreset =
                existing ??
                em.create(LeverPreset, {
                    key: row.key,
                    name: row.name,
                    description: row.description,
                    accentColor: row.accentColor,
                    spendingStyles: [...row.spendingStyles],
                    minWealthStage,
                    sortOrder,
                    isActive: true,
                } as never);
            preset.postures.set(postures);
        }
        await em.flush();
    }
}
