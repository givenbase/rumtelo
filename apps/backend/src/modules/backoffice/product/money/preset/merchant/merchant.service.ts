import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';

import type { JarKey } from '@rumtelo/contracts';
import { containsWord } from '@rumtelo/utils';

import { MerchantPreset } from './merchant.entity';

const DEFAULT_MARKET = 'NL';

@Injectable()
export class MerchantPresetService {
    constructor(@Inject(EntityManager) private readonly em: EntityManager) {}

    /**
     * Active merchants for one market, filtered in SQL and sorted:
     * highlighted first, then matchPriority desc, then sortOrder asc.
     */
    async listActive(filters?: {
        jarKey?: JarKey;
        categoryTemplateKey?: string;
        mcc?: string;
        market?: string;
    }): Promise<MerchantPreset[]> {
        const market = (filters?.market ?? DEFAULT_MARKET).toUpperCase();
        const rows = await this.em.find(
            MerchantPreset,
            {
                isActive: true,
                markets: { key: market },
                ...(filters?.jarKey ? { jarTemplate: { key: filters.jarKey } } : {}),
                ...(filters?.categoryTemplateKey
                    ? { categoryTemplate: { key: filters.categoryTemplateKey } }
                    : {}),
                ...(filters?.mcc ? { matching: { mcc: filters.mcc } } : {}),
            },
            {
                populate: [
                    'jarTemplate',
                    'categoryTemplate',
                    'givingOrganisation',
                    'markets',
                    'matching',
                    'branding',
                    'banking',
                ],
            }
        );
        return rows.sort((left, right) => {
            const leftHi = left.highlight ? 1 : 0;
            const rightHi = right.highlight ? 1 : 0;
            if (rightHi !== leftHi) return rightHi - leftHi;
            const leftPri = left.matching?.matchPriority ?? 0;
            const rightPri = right.matching?.matchPriority ?? 0;
            if (rightPri !== leftPri) return rightPri - leftPri;
            return left.sortOrder - right.sortOrder;
        });
    }

    /**
     * First-pass bank-feed matcher: MCC exact, then case-insensitive **whole-word**
     * match of matchValue + aliases against counterparty/description text
     * (`NS` must not hit "Belastingdienst", `ING` must not hit "Booking").
     * Higher matchPriority wins when multiple needles hit, then lower sortOrder.
     */
    async matchFeed(input: {
        text?: string | null;
        mcc?: string | null;
        market?: string;
    }): Promise<MerchantPreset | null> {
        return matchMerchant(await this.listActive({ market: input.market }), input);
    }
}

/**
 * Pick the best merchant from an already-loaded catalog.
 * MCC wins outright; otherwise the highest matchPriority whole-word hit, then sortOrder.
 */
export function matchMerchant(
    merchants: readonly MerchantPreset[],
    input: { text?: string | null; mcc?: string | null }
): MerchantPreset | null {
    const mcc = input.mcc?.trim();
    if (mcc) {
        const byMcc = merchants
            .filter(preset => preset.matching?.mcc === mcc)
            .sort(
                (left, right) =>
                    (right.matching?.matchPriority ?? 0) - (left.matching?.matchPriority ?? 0)
            );
        if (byMcc[0]) return byMcc[0];
    }
    const text = (input.text ?? '').trim().toLowerCase();
    if (!text) return null;
    let best: MerchantPreset | null = null;
    for (const row of merchants) {
        const matching = row.matching;
        if (!matching) continue;
        const needles = [matching.matchValue, ...matching.aliases]
            .map(alias => alias.trim().toLowerCase())
            .filter(Boolean);
        if (!needles.some(needle => containsWord(text, needle))) continue;
        const bestPri = best?.matching?.matchPriority ?? -1;
        if (
            !best ||
            matching.matchPriority > bestPri ||
            (matching.matchPriority === bestPri && row.sortOrder < (best?.sortOrder ?? 0))
        ) {
            best = row;
        }
    }
    return best;
}
