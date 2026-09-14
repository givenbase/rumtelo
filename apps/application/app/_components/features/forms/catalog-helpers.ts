'use client';

import { apiQuery } from '@/app/_lib/api-hooks';
import type { AppClient, Category } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';

import { isLiveData } from '@/app/_lib/preview';
import { useAuth } from '@/components/features/shell/auth-provider';

/** Resolve or create a household category under a jar by display name. */
export async function resolveCategoryId(opts: {
    api: AppClient;
    householdId: string;
    jarId: string;
    categoryName: string;
    existing: ReadonlyArray<Pick<Category, 'id' | 'name' | 'isArchived'>>;
}): Promise<string | null> {
    const name = opts.categoryName.trim();
    if (!name) return null;
    const found = opts.existing.find(
        category => !category.isArchived && category.name.toLowerCase() === name.toLowerCase()
    );
    if (found) return found.id;
    const created = await opts.api.money.jars.createCategory({
        householdId: opts.householdId,
        jarId: opts.jarId,
        name,
        budgeted: 0,
    });
    return created.id;
}

export function useCategoryTemplates(enabled: boolean) {
    const { householdId } = useAuth();
    const live = isLiveData(householdId) && enabled;
    return useLiveQuery(
        apiQuery.money.catalogs.categoryTemplates.list.queryOptions({
            input: { householdId: householdId! },
        }),
        [],
        live
    );
}
