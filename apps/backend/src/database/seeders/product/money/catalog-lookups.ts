import type { EntityManager } from '@mikro-orm/postgresql';

import { Audience } from '../../../../modules/backoffice/product/money/catalog/audience/audience.entity';
import { GivingOrganisation } from '../../../../modules/backoffice/product/money/catalog/giving-organisation/giving-organisation.entity';
import { Market } from '../../../../modules/backoffice/product/money/catalog/market/market.entity';
import { MerchantPreset } from '../../../../modules/backoffice/product/money/preset/merchant/merchant.entity';
import { CategoryTemplate } from '../../../../modules/backoffice/product/money/template/category/category.entity';

/**
 * Key → entity lookups for seeders that link presets to catalog rows.
 * Each loader reads the whole (small) catalog once; `require*` throws with a
 * clear message when a seed row references a key that was never seeded, so a
 * typo fails the seed instead of silently producing a dangling chip.
 */

type Keyed = { key: string };

function requireFrom<T extends Keyed>(map: Map<string, T>, label: string, owner: string) {
    return (key: string): T => {
        const row = map.get(key);
        if (!row) {
            throw new Error(`${owner} references unknown ${label} key "${key}" — seed it first`);
        }
        return row;
    };
}

async function loadByKey<T extends Keyed>(
    em: EntityManager,
    entity: new () => T
): Promise<Map<string, T>> {
    const rows = await em.find(entity as never, {});
    return new Map((rows as T[]).map(row => [row.key, row]));
}

export async function loadCategoryTemplates(em: EntityManager, owner: string) {
    return requireFrom(await loadByKey(em, CategoryTemplate), 'CategoryTemplate', owner);
}

export async function loadAudiences(em: EntityManager, owner: string) {
    return requireFrom(await loadByKey(em, Audience), 'Audience', owner);
}

export async function loadMarkets(em: EntityManager, owner: string) {
    return requireFrom(await loadByKey(em, Market), 'Market', owner);
}

export async function loadGivingOrganisations(em: EntityManager, owner: string) {
    return requireFrom(await loadByKey(em, GivingOrganisation), 'GivingOrganisation', owner);
}

export async function loadMerchantPresets(em: EntityManager, owner: string) {
    return requireFrom(await loadByKey(em, MerchantPreset), 'MerchantPreset', owner);
}
