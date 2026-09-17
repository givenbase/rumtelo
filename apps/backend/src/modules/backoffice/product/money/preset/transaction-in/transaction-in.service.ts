import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';

import { TransactionInPreset } from './transaction-in.entity';

@Injectable()
export class TransactionInPresetService {
    constructor(@Inject(EntityManager) private readonly em: EntityManager) {}

    async listActive(): Promise<TransactionInPreset[]> {
        return this.em.find(
            TransactionInPreset,
            { isActive: true },
            { orderBy: { sortOrder: 'ASC' } }
        );
    }
}
