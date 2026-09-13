import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';

import type { GivingCause, GivingOrganisation as GivingOrganisationDto } from '@rumtelo/contracts';

import { GivingOrganisation } from './giving-organisation.entity';

@Injectable()
export class GivingOrganisationService {
    constructor(@Inject(EntityManager) private readonly em: EntityManager) {}

    async listActive(filters?: { cause?: GivingCause }): Promise<GivingOrganisationDto[]> {
        const rows = await this.em.find(
            GivingOrganisation,
            { isActive: true },
            { orderBy: { sortOrder: 'ASC' } }
        );
        const filtered = filters?.cause
            ? rows.filter(row => row.causes.includes(filters.cause!))
            : rows;
        return filtered.map(row => ({
            key: row.key,
            name: row.name,
            sortOrder: row.sortOrder,
            summary: row.summary,
            causes: row.causes,
            country: row.country,
            scope: row.scope,
            website: row.website,
            signals: row.signals,
            reporting: row.reporting,
        }));
    }
}
