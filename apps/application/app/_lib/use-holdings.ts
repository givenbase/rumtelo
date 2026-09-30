'use client';

import { useMemo } from 'react';

import type { Asset, AssetKind } from '@rumtelo/contracts';
import { CAPABILITIES } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';

import { apiQuery } from '@/app/_lib/api-hooks';
import { isLiveData } from '@/app/_lib/preview';
import { useAuth } from '@/components/features/shell/auth-provider';
import { usePlanCapabilities } from '@/components/features/shell/use-plan-capabilities';

const EMPTY_ASSETS: Asset[] = [];
const EMPTY_KINDS: AssetKind[] = [];

export type Holding = Asset & { icon: string | null; kindName: string | null };

/**
 * Growth holdings a money row can be attributed to (asset in / out).
 * Empty and idle when the plan has no net-worth capability — the pickers hide.
 */
export function useHoldings(): {
    canLink: boolean;
    holdings: Holding[];
    byId: Map<string, Holding>;
    ready: boolean;
} {
    const { householdId } = useAuth();
    const { hasCapability } = usePlanCapabilities();
    const canLink = hasCapability(CAPABILITIES.growthNetWorth);
    const live = isLiveData(householdId) && canLink;

    const assetsQuery = useLiveQuery(
        apiQuery.growth.assets.list.queryOptions({ input: { householdId: householdId! } }),
        EMPTY_ASSETS,
        live
    );
    const kindsQuery = useLiveQuery(
        apiQuery.growth.catalogs.assetKinds.list.queryOptions({
            input: { householdId: householdId! },
        }),
        EMPTY_KINDS,
        live
    );

    const holdings = useMemo((): Holding[] => {
        if (!canLink) return [];
        const kinds = new Map((kindsQuery.data ?? EMPTY_KINDS).map(kind => [kind.key, kind]));
        return (assetsQuery.data ?? EMPTY_ASSETS).map(asset => {
            const kind = kinds.get(asset.kindKey);
            return { ...asset, icon: kind?.icon ?? null, kindName: kind?.name ?? null };
        });
    }, [canLink, assetsQuery.data, kindsQuery.data]);

    const byId = useMemo(() => new Map(holdings.map(row => [row.id, row])), [holdings]);

    return {
        canLink,
        holdings,
        byId,
        ready: !live || (!assetsQuery.isLoading && !kindsQuery.isLoading),
    };
}
