import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';

import type { DebtKind } from '@rumtelo/contracts';

import { DebtPreset } from './debt.entity';

@Injectable()
export class DebtPresetService {
    constructor(@Inject(EntityManager) private readonly em: EntityManager) {}

    async listActive(filters?: { kind?: DebtKind }): Promise<DebtPreset[]> {
        return this.em.find(
            DebtPreset,
            {
                isActive: true,
                ...(filters?.kind ? { kind: filters.kind } : {}),
            },
            { orderBy: { sortOrder: 'ASC' }, populate: ['merchantLinks.merchant'] }
        );
    }
}
