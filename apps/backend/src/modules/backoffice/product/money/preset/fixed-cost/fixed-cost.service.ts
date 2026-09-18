import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';

import type { JarKey } from '@rumtelo/contracts';

import { FixedCostPreset } from './fixed-cost.entity';

@Injectable()
export class FixedCostPresetService {
    constructor(@Inject(EntityManager) private readonly em: EntityManager) {}

    /** Active presets, all filters applied in SQL; relations populated for DTO mapping. */
    async listActive(filters?: {
        jarKey?: JarKey;
        categoryTemplateKey?: string;
        audienceKey?: string;
    }): Promise<FixedCostPreset[]> {
        return this.em.find(
            FixedCostPreset,
            {
                isActive: true,
                ...(filters?.jarKey ? { jarTemplate: { key: filters.jarKey } } : {}),
                ...(filters?.categoryTemplateKey
                    ? { categoryTemplate: { key: filters.categoryTemplateKey } }
                    : {}),
                ...(filters?.audienceKey ? { audiences: { key: filters.audienceKey } } : {}),
            },
            {
                orderBy: { sortOrder: 'ASC' },
                populate: [
                    'jarTemplate',
                    'categoryTemplate',
                    'audiences',
                    'merchantLinks.merchant',
                ],
            }
        );
    }
}
