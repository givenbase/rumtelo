import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';
import type { LearnBookPreset } from '@rumtelo/contracts';
import { shuffled } from '@rumtelo/utils';

import { BookPreset } from './book.entity';

@Injectable()
export class BookPresetService {
    constructor(@Inject(EntityManager) private readonly em: EntityManager) {}

    /**
     * Active recommended books — shuffled each fetch so the library does not
     * read as a fixed seed order. Plan filtering stays with the caller.
     */
    async listActive(): Promise<LearnBookPreset[]> {
        const rows = await this.em.find(BookPreset, { isActive: true });
        return shuffled(rows).map(toDto);
    }
}

function toDto(row: BookPreset): LearnBookPreset {
    return {
        key: row.key,
        name: row.name,
        sortOrder: row.sortOrder,
        description: row.description,
        author: row.author,
        skill: row.skill,
        topic: row.topic,
        minPlan: row.minPlan,
        spendingStyles: row.spendingStyles,
        coverId: row.coverId,
        isbn13: row.isbn13,
        url: row.url,
    };
}
