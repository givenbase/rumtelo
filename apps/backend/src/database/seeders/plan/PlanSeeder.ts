import type { EntityManager } from '@mikro-orm/postgresql';

import { Seeder } from '@mikro-orm/seeder';
import type { CapabilityKey } from '@rumtelo/contracts';

import { PlanCapabilityGrant } from '../../../modules/backoffice/plan/plan-capability-grant/plan-capability-grant.entity';
import { PlanCapability } from '../../../modules/backoffice/plan/plan-capability/plan-capability.entity';
import {
    PLAN_CAPABILITY_GRANT_SEED,
    PLAN_CAPABILITY_SEED,
} from '../../../modules/backoffice/plan/plan-capability/seed/plan-capability.seed-data';
import { PlanFeature } from '../../../modules/backoffice/plan/plan-feature/plan-feature.entity';
import { PLAN_FEATURE_SEED } from '../../../modules/backoffice/plan/plan-feature/seed/plan-feature.seed-data';
import { PlanProduct } from '../../../modules/backoffice/plan/plan-product/plan-product.entity';
import { PLAN_PRODUCT_SEED } from '../../../modules/backoffice/plan/plan-product/seed/plan-product.seed-data';
import { Plan } from '../../../modules/backoffice/plan/plan.entity';
import { PLAN_SEED } from '../../../modules/backoffice/plan/seed/plan.seed-data';

/**
 * Seeds (order matters):
 *   1. plan_product
 *   2. plan_feature            (FK → product)
 *   3. plan_capability         (FK → feature)
 *   4. plan
 *   5. plan_capability_grant   (FK → plan, capability)
 */
export class PlanSeeder extends Seeder {
    async run(em: EntityManager): Promise<void> {
        await this.seedProducts(em);
        await this.seedFeatures(em);
        await this.seedCapabilities(em);
        await this.seedPlans(em);
        await this.seedGrants(em);
        await em.flush();
    }

    private async seedProducts(em: EntityManager): Promise<void> {
        const keys = PLAN_PRODUCT_SEED.map(row => row.key);
        const existingRows = await em.find(PlanProduct, { key: { $in: keys } });
        const existingByKey = new Map(existingRows.map(row => [row.key, row]));

        for (const row of PLAN_PRODUCT_SEED) {
            const existing = existingByKey.get(row.key);
            if (existing) {
                existing.name = row.name;
                existing.sortOrder = row.sortOrder;
                existing.isActive = true;
                continue;
            }
            em.create(PlanProduct, {
                key: row.key,
                name: row.name,
                sortOrder: row.sortOrder,
                isActive: true,
            } as never);
        }
        await em.flush();
    }

    private async seedFeatures(em: EntityManager): Promise<void> {
        const products = await em.find(PlanProduct, {});
        const productByKey = new Map(products.map(product => [product.key, product]));

        const existingRows = await em.find(PlanFeature, {}, { populate: ['product'] });
        const existingByPair = new Map(
            existingRows.map(row => [`${row.product.key}:${row.key}`, row])
        );

        for (const row of PLAN_FEATURE_SEED) {
            const product = productByKey.get(row.productKey);
            if (!product) continue;
            const pair = `${row.productKey}:${row.key}`;
            const existing = existingByPair.get(pair);
            if (existing) {
                existing.name = row.name;
                existing.description = row.description;
                existing.sortOrder = row.sortOrder;
                existing.isActive = true;
                continue;
            }
            em.create(PlanFeature, {
                key: row.key,
                name: row.name,
                description: row.description,
                sortOrder: row.sortOrder,
                isActive: true,
                product,
            } as never);
        }
        await em.flush();
    }

    private async seedCapabilities(em: EntityManager): Promise<void> {
        const features = await em.find(PlanFeature, {}, { populate: ['product'] });
        const featureByCapabilityKey = new Map(
            PLAN_FEATURE_SEED.map(row => {
                const feature = features.find(
                    candidate =>
                        candidate.product.key === row.productKey && candidate.key === row.key
                );
                return [row.capabilityKey, feature] as const;
            }).filter((entry): entry is readonly [CapabilityKey, PlanFeature] => Boolean(entry[1]))
        );

        const keys = PLAN_CAPABILITY_SEED.map(row => row.key);
        const existingRows = await em.find(PlanCapability, { key: { $in: keys } });
        const existingByKey = new Map(existingRows.map(row => [row.key, row]));

        for (const row of PLAN_CAPABILITY_SEED) {
            const feature = featureByCapabilityKey.get(row.key);
            if (!feature) continue;
            const existing = existingByKey.get(row.key);
            if (existing) {
                existing.name = row.name;
                existing.description = row.description;
                existing.kind = row.kind;
                existing.sortOrder = row.sortOrder;
                existing.isActive = true;
                existing.feature = feature;
                continue;
            }
            em.create(PlanCapability, {
                key: row.key,
                name: row.name,
                description: row.description,
                kind: row.kind,
                sortOrder: row.sortOrder,
                isActive: true,
                feature,
            } as never);
        }
        await em.flush();
    }

    private async seedPlans(em: EntityManager): Promise<void> {
        const keys = PLAN_SEED.map(row => row.key);
        const existingRows = await em.find(Plan, { key: { $in: keys } });
        const existingByKey = new Map(existingRows.map(row => [row.key, row]));

        for (const [sortOrder, row] of PLAN_SEED.entries()) {
            const existing = existingByKey.get(row.key);
            if (existing) {
                existing.name = row.name;
                existing.priceMonthly = row.priceMonthly;
                existing.sortOrder = sortOrder;
                existing.isActive = true;
                continue;
            }
            em.create(Plan, {
                key: row.key,
                name: row.name,
                priceMonthly: row.priceMonthly,
                sortOrder,
                isActive: true,
            } as never);
        }
        await em.flush();
    }

    private async seedGrants(em: EntityManager): Promise<void> {
        const plans = await em.find(Plan, {});
        const capabilities = await em.find(PlanCapability, {});
        const planByKey = new Map(plans.map(plan => [plan.key, plan]));
        const capabilityByKey = new Map(
            capabilities.map(capability => [capability.key as CapabilityKey, capability])
        );

        const existingGrants = await em.find(
            PlanCapabilityGrant,
            {},
            { populate: ['plan', 'capability'] }
        );
        const pairOf = (grant: PlanCapabilityGrant) => `${grant.plan.key}:${grant.capability.key}`;
        const existingPairs = new Set(existingGrants.map(pairOf));
        const desiredPairs = new Set(
            PLAN_CAPABILITY_GRANT_SEED.map(row => `${row.planKey}:${row.capabilityKey}`)
        );

        for (const grant of existingGrants) {
            if (!desiredPairs.has(pairOf(grant))) em.remove(grant);
        }

        for (const row of PLAN_CAPABILITY_GRANT_SEED) {
            if (existingPairs.has(`${row.planKey}:${row.capabilityKey}`)) continue;
            const plan = planByKey.get(row.planKey);
            const capability = capabilityByKey.get(row.capabilityKey);
            if (!plan || !capability) continue;
            em.create(PlanCapabilityGrant, { plan, capability } as never);
        }
    }
}
