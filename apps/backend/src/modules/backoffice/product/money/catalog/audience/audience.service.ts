import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';

import { Audience } from './audience.entity';

@Injectable()
export class AudienceService {
    constructor(@Inject(EntityManager) private readonly em: EntityManager) {}

    async listActive(): Promise<Audience[]> {
        return this.em.find(Audience, { isActive: true }, { orderBy: { sortOrder: 'ASC' } });
    }
}
