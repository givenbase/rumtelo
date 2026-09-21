'use client';

import { useMemo } from 'react';

import {
    CAPABILITIES,
    PLAN_ACCESS,
    capabilitiesFor,
    featuresForProduct,
    hasCapability,
    isCapabilityLocked,
    limitFor,
    minPlanForCapability,
    productsWithGrants,
    withinLimit,
    type PlanLimitKey,
} from '@/app/_lib/plan';
import { isCapabilityEnabledAtLaunch, isProductEnabled } from '@/app/_lib/launch-products';
import { capabilityAccessForPath, capabilityKeyForPathname } from '@/app/_lib/capability-access';
import { useAppShell } from '@/components/features/shell/app-shell-context';

/**
 * Plan capability checks — plan → product → feature.
 */
export function usePlanCapabilities() {
    const { plan, planReady } = useAppShell();
    const caps = capabilitiesFor(plan);

    return useMemo(
        () => ({
            plan,
            planReady,
            caps,
            access: PLAN_ACCESS[plan],
            grantedKeys: caps.capabilityKeys,
            productsWithGrants: productsWithGrants(plan).filter(product =>
                isProductEnabled(product)
            ),
            featuresForProduct: (product: Parameters<typeof featuresForProduct>[1]) =>
                featuresForProduct(plan, product),
            hasCapability: (capabilityKey: string | null | undefined) =>
                isCapabilityEnabledAtLaunch(capabilityKey) &&
                (!planReady || hasCapability(capabilityKey, plan)),
            isCapabilityLocked: (capabilityKey: string | null | undefined) =>
                !isCapabilityEnabledAtLaunch(capabilityKey) ||
                (planReady && isCapabilityLocked(capabilityKey, plan)),
            requiredPlanFor: (capabilityKey: string) => minPlanForCapability(capabilityKey),
            limitFor: (key: PlanLimitKey) => limitFor(plan, key),
            withinLimit: (key: PlanLimitKey, occupied: number) => withinLimit(plan, key, occupied),
            capabilities: CAPABILITIES,
            capabilityKeyForPath: capabilityKeyForPathname,
            accessForPath: (pathname: string) =>
                capabilityAccessForPath(pathname, plan, (key, nextPlan) =>
                    !isCapabilityEnabledAtLaunch(key)
                        ? true
                        : planReady
                          ? isCapabilityLocked(key, nextPlan)
                          : false
                ),
        }),
        [plan, planReady, caps]
    );
}

export type PlanCapabilitiesApi = ReturnType<typeof usePlanCapabilities>;

/** Map quick-add / create kinds onto gated capability keys. */
export const CREATE_KIND_CAPABILITY: Partial<Record<string, string>> = {
    debt: CAPABILITIES.moneyDebt,
    goal: CAPABILITIES.growthGoals,
    income: CAPABILITIES.growthIncome,
    asset: CAPABILITIES.growthNetWorth,
};
