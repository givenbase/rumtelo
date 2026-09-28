import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';

import type { GivingCause, GivingOrganization as GivingOrganizationDto } from '@rumtelo/contracts';

import { GivingOrganization } from './giving-organization.entity';

@Injectable()
export class GivingOrganizationService {
    constructor(@Inject(EntityManager) private readonly em: EntityManager) {}

    /** Active organizations; `cause` filter is a JSON containment check in SQL. */
    async listActive(filters?: { cause?: GivingCause }): Promise<GivingOrganizationDto[]> {
        const rows = await this.em.find(
            GivingOrganization,
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
