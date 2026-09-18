import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';

import type { JarKey } from '@rumtelo/contracts';

import { MerchantPreset } from './merchant.entity';

const DEFAULT_MARKET = 'NL';

const WORD_CHAR = /[\p{L}\p{N}]/u;

/**
 * Case-insensitive needle match that respects word edges on the needle's own
 * letter/digit ends. `ns` matches "NS GROEP" but not "belastingdienst";
 * `microsoft*` still matches "MICROSOFT*XBOX" because `*` is not a word char.
 * Both inputs are expected lower-cased.
 */
export function containsWord(text: string, needle: string): boolean {
    let from = 0;
    while (from <= text.length - needle.length) {
        const at = text.indexOf(needle, from);
        if (at === -1) return false;
        const before = text[at - 1];
        const after = text[at + needle.length];
        const startOk = !WORD_CHAR.test(needle.charAt(0)) || !before || !WORD_CHAR.test(before);
        const endOk = !WORD_CHAR.test(needle.slice(-1)) || !after || !WORD_CHAR.test(after);
        if (startOk && endOk) return true;
        from = at + 1;
    }
    return false;
}

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
        const active = await this.listActive({ market: input.market });
        const mcc = input.mcc?.trim();
        if (mcc) {
            const byMcc = active
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
        for (const row of active) {
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
}
