import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';

import type { JarKey } from '@rumtelo/contracts';

import { MerchantPreset } from './merchant.entity';

@Injectable()
export class MerchantPresetService {
    constructor(@Inject(EntityManager) private readonly em: EntityManager) {}

    async listActive(filters?: {
        jarKey?: JarKey;
        categoryTemplateKey?: string;
        mcc?: string;
        market?: string;
    }): Promise<MerchantPreset[]> {
        const market = (filters?.market ?? 'NL').toUpperCase();
        const rows = await this.em.find(
            MerchantPreset,
            {
                isActive: true,
                ...(filters?.jarKey ? { jarTemplate: { key: filters.jarKey } } : {}),
                ...(filters?.categoryTemplateKey
                    ? { categoryTemplateKey: filters.categoryTemplateKey }
                    : {}),
                ...(filters?.mcc ? { mcc: filters.mcc } : {}),
            },
            { populate: ['jarTemplate'] }
        );
        return rows
            .filter(row => (row.markets?.length ? row.markets : ['NL']).includes(market))
            .sort((left, right) => {
                const leftHi = left.highlight ? 1 : 0;
                const rightHi = right.highlight ? 1 : 0;
                if (rightHi !== leftHi) return rightHi - leftHi;
                if (right.matchPriority !== left.matchPriority) {
                    return right.matchPriority - left.matchPriority;
                }
                return left.sortOrder - right.sortOrder;
            });
    }

    /**
     * First-pass bank-feed matcher: MCC exact, then case-insensitive CONTAINS
     * on matchValue + aliases against counterparty/description text.
     * Higher matchPriority wins when multiple needles hit.
     */
    async matchFeed(input: {
        text?: string | null;
        mcc?: string | null;
        market?: string;
    }): Promise<MerchantPreset | null> {
        const isActive = await this.listActive({ market: input.market });
        const mcc = input.mcc?.trim();
        if (mcc) {
            const byMcc = isActive
                .filter(preset => preset.mcc === mcc)
                .sort((left, right) => right.matchPriority - left.matchPriority);
            if (byMcc[0]) return byMcc[0];
        }
        const text = (input.text ?? '').trim().toLowerCase();
        if (!text) return null;
        let best: MerchantPreset | null = null;
        for (const row of isActive) {
            const needles = [row.matchValue, ...row.aliases]
                .map(alias => alias.trim().toLowerCase())
                .filter(Boolean);
            if (!needles.some(needle => text.includes(needle))) continue;
            if (
                !best ||
                row.matchPriority > best.matchPriority ||
                (row.matchPriority === best.matchPriority && row.sortOrder < best.sortOrder)
            ) {
                best = row;
            }
        }
        return best;
    }
}
