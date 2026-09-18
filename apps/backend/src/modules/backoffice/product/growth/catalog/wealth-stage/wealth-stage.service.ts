import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';

import type { WealthStage as WealthStageDto } from '@rumtelo/contracts';

import { WealthStage } from './wealth-stage.entity';

@Injectable()
export class WealthStageService {
    constructor(@Inject(EntityManager) private readonly em: EntityManager) {}

    async listActive(): Promise<WealthStageDto[]> {
        const rows = await this.em.find(
            WealthStage,
            { isActive: true },
            { orderBy: { sortOrder: 'ASC' } }
        );
        return rows.map(row => ({
            key: row.key,
            name: row.name,
            sortOrder: row.sortOrder,
            description: row.description,
            badgeLabel: row.badgeLabel,
            minNetWorth: row.minNetWorth,
        }));
    }

    async findByKey(key: string): Promise<WealthStage | null> {
        return this.em.findOne(WealthStage, { key, isActive: true });
    }
}
