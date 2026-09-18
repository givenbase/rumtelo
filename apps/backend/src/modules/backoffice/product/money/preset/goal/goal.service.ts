import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';

import type { JarKey } from '@rumtelo/contracts';

import { GoalPreset } from './goal.entity';

@Injectable()
export class GoalPresetService {
    constructor(@Inject(EntityManager) private readonly em: EntityManager) {}

    async listActive(filters?: { jarKey?: JarKey }): Promise<GoalPreset[]> {
        return this.em.find(
            GoalPreset,
            {
                isActive: true,
                ...(filters?.jarKey ? { jarTemplate: { key: filters.jarKey } } : {}),
            },
            { orderBy: { sortOrder: 'ASC' }, populate: ['jarTemplate', 'categoryTemplate'] }
        );
    }
}
