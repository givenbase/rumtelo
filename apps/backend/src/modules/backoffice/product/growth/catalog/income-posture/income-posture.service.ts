import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';

import type { IncomePosture as IncomePostureDto } from '@rumtelo/contracts';

import { IncomePosture } from './income-posture.entity';

@Injectable()
export class IncomePostureService {
    constructor(@Inject(EntityManager) private readonly em: EntityManager) {}

    async listActive(): Promise<IncomePostureDto[]> {
        const rows = await this.em.find(
            IncomePosture,
            { isActive: true },
            { orderBy: { sortOrder: 'ASC' } }
        );
        return rows.map(row => ({
            key: row.key,
            name: row.name,
            sortOrder: row.sortOrder,
            description: row.description,
        }));
    }

    async findByKey(key: string): Promise<IncomePosture | null> {
        return this.em.findOne(IncomePosture, { key, isActive: true });
    }
}
