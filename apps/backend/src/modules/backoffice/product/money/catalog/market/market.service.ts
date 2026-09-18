import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';

import { Market } from './market.entity';

@Injectable()
export class MarketService {
    constructor(@Inject(EntityManager) private readonly em: EntityManager) {}

    async listActive(): Promise<Market[]> {
        return this.em.find(Market, { isActive: true }, { orderBy: { sortOrder: 'ASC' } });
    }
}
