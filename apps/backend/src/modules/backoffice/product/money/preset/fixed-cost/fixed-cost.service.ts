import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';

import type { JarKey } from '@rumtelo/contracts';

import { FixedCostPreset } from './fixed-cost.entity';

@Injectable()
export class FixedCostPresetService {
    constructor(@Inject(EntityManager) private readonly em: EntityManager) {}

    async listActive(filters?: {
        jarKey?: JarKey;
        categoryTemplateKey?: string;
        audienceKey?: string;
    }): Promise<FixedCostPreset[]> {
        const rows = await this.em.find(
            FixedCostPreset,
            {
                isActive: true,
                ...(filters?.jarKey ? { jarTemplate: { key: filters.jarKey } } : {}),
                ...(filters?.categoryTemplateKey
                    ? { categoryTemplateKey: filters.categoryTemplateKey }
                    : {}),
            },
            { orderBy: { sortOrder: 'ASC' }, populate: ['jarTemplate'] }
        );
        if (!filters?.audienceKey) return rows;
        return rows.filter(preset => preset.audienceKeys.includes(filters.audienceKey!));
    }
}
