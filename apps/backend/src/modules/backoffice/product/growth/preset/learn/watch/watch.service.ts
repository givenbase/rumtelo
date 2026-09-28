import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';
import type { LearnWatchPreset } from '@rumtelo/contracts';
import { shuffled } from '@rumtelo/utils';

import { WatchPreset } from './watch.entity';

@Injectable()
export class WatchPresetService {
    constructor(@Inject(EntityManager) private readonly em: EntityManager) {}

    /**
     * Active films, videos, series, podcasts, and courses — shuffled each fetch so the
     * library does not read as a fixed seed order. Plan filtering stays with the caller.
     */
    async listActive(): Promise<LearnWatchPreset[]> {
        const rows = await this.em.find(
            WatchPreset,
            { isActive: true },
            { populate: ['merchant'] }
        );
        return shuffled(rows).map(toDto);
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
        merchantKey: row.merchant?.key ?? null,
    };
}
