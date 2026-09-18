import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';
import type { LearnWatchPreset } from '@rumtelo/contracts';

import { WatchPreset } from './watch.entity';

@Injectable()
export class WatchPresetService {
    constructor(@Inject(EntityManager) private readonly em: EntityManager) {}

    /**
     * Active films, videos, and series, in shelf order.
     * Plan and spending-style filtering stay with the caller.
     */
    async listActive(): Promise<LearnWatchPreset[]> {
        const rows = await this.em.find(
            WatchPreset,
            { isActive: true },
            { orderBy: { sortOrder: 'ASC' } }
        );
        return rows.map(toDto);
    }
}

function toDto(row: WatchPreset): LearnWatchPreset {
    return {
        key: row.key,
        name: row.name,
        sortOrder: row.sortOrder,
        description: row.description,
        creator: row.creator,
        skill: row.skill,
        topic: row.topic,
        minPlan: row.minPlan,
        spendingStyles: row.spendingStyles,
        format: row.format,
        youtubeId: row.youtubeId,
        url: row.url,
        watchUrl: row.watchUrl,
    };
}
