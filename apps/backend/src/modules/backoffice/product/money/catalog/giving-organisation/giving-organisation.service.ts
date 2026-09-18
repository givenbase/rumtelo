import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';

import type { GivingCause, GivingOrganisation as GivingOrganisationDto } from '@rumtelo/contracts';

import { GivingOrganisation } from './giving-organisation.entity';

@Injectable()
export class GivingOrganisationService {
    constructor(@Inject(EntityManager) private readonly em: EntityManager) {}

    /** Active organisations; `cause` filter is a JSON containment check in SQL. */
    async listActive(filters?: { cause?: GivingCause }): Promise<GivingOrganisationDto[]> {
        const rows = await this.em.find(
            GivingOrganisation,
            {
                isActive: true,
                ...(filters?.cause ? { causes: { $contains: [filters.cause] } } : {}),
            },
            { orderBy: { sortOrder: 'ASC' } }
        );
        return rows.map(row => ({
            key: row.key,
            name: row.name,
            sortOrder: row.sortOrder,
            description: row.description,
            causes: row.causes,
            country: row.country,
            scope: row.scope,
            website: row.website,
            signals: row.signals,
            reporting: row.reporting,
        }));
    }
}
