import type { FilterQuery } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';

import {
    INCOME_POSTURE_KEYS,
    SpendingStyle,
    WEALTH_STAGE_KEYS,
    type GrowthLeverPreset,
} from '@rumtelo/contracts';

import { WealthStage } from '../../catalog/wealth-stage/wealth-stage.entity';
import { LeverPreset } from './lever.entity';

@Injectable()
export class LeverPresetService {
    constructor(@Inject(EntityManager) private readonly em: EntityManager) {}

    /**
     * Active levers for an audience. Stage and posture are filtered in SQL
     * (`UNKNOWN` posture = no posture filter; an untagged lever matches everyone).
     * Spending style is a small jsonb enum list and is filtered the same way.
     */
    async listActive(filters?: {
        postureKey?: string;
        spendingStyle?: SpendingStyle;
        stageKey?: string;
    }): Promise<GrowthLeverPreset[]> {
        const stageKey = filters?.stageKey ?? WEALTH_STAGE_KEYS.BUILDING;
        const stage = await this.em.findOne(WealthStage, { key: stageKey, isActive: true });
        const stageSortOrder = stage?.sortOrder ?? 0;

        const postureKey = filters?.postureKey ?? INCOME_POSTURE_KEYS.UNKNOWN;
        const spendingStyle = filters?.spendingStyle ?? SpendingStyle.UNKNOWN;

        const audience: FilterQuery<LeverPreset>[] = [];
        if (postureKey !== INCOME_POSTURE_KEYS.UNKNOWN) {
            audience.push({
                $or: [{ postures: { $none: {} } }, { postures: { $some: { key: postureKey } } }],
            });
        }
        if (spendingStyle !== SpendingStyle.UNKNOWN) {
            audience.push({
                $or: [
                    { spendingStyles: { $eq: [] } },
                    { spendingStyles: { $contains: [spendingStyle] } },
                ],
            });
        }

        const rows = await this.em.find(
            LeverPreset,
            {
                isActive: true,
                minWealthStage: { sortOrder: { $lte: stageSortOrder } },
                ...(audience.length ? { $and: audience } : {}),
            },
            { orderBy: { sortOrder: 'ASC' }, populate: ['minWealthStage', 'postures'] }
        );
        return rows.map(toDto);
    }
}

function toDto(row: LeverPreset): GrowthLeverPreset {
    return {
        key: row.key,
        name: row.name,
        sortOrder: row.sortOrder,
        description: row.description,
        accentColor: row.accentColor,
        postureKeys: row.postures.getItems().map(posture => posture.key),
        spendingStyles: row.spendingStyles,
        minWealthStageKey: row.minWealthStage.key,
        minWealthStageSortOrder: row.minWealthStage.sortOrder,
    };
}
