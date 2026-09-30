import { type EntityManager } from '@mikro-orm/postgresql';
import { CAPABILITIES } from '@rumtelo/contracts';

import { type PlanAccessService } from '../../../../common/capability';
import { apiNotFound } from '../../../../common/errors/api-user-error';
import { currentHouseholdId } from '../../../../common/household/household.context';
import { Asset } from '../growth/asset/asset.entity';

/**
 * Resolve an optional growth-asset attribution on a money row.
 *
 * - `undefined` → leave as is (patch semantics)
 * - `null`      → clear the link
 * - id          → must be the household's own holding and the plan must have net worth;
 *                 never silently dropped so a Basic/Plus client cannot write it through the API.
 */
export async function resolveAssetLink(
    em: EntityManager,
    planAccess: PlanAccessService,
    assetId: string | null | undefined
): Promise<string | null | undefined> {
    if (assetId === undefined) return undefined;
    if (assetId === null) return null;
    await planAccess.assertCapability(CAPABILITIES.growthNetWorth);
    const asset = await em.findOne(Asset, { id: assetId, household: currentHouseholdId() });
    if (!asset) throw apiNotFound('asset_not_found');
    return asset.id;
}
