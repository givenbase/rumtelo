'use client';

import { useCallback, useMemo } from 'react';

import type { JarKey } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations } from '@rumtelo/i18n';

import { apiQuery } from '@/app/_lib/api-hooks';
import { resolvePotName, resolvePotPurpose } from '@/app/_lib/jar-copy';
import { isLiveData } from '@/app/_lib/preview';
import { useAuth } from '@/components/features/shell/auth-provider';

/** The two fields every jar-like DTO shares; the key decides whether the stored name is a seed default. */
type JarNameSource = { key: JarKey | string; name: string };

/**
 * The keys of the pots this household has (3 to 8). Reads the jar list the app already
 * loads everywhere (same query key, so one shared cache entry, no extra request per caller).
 * Empty while the list is loading or in preview: callers then fall back to per-pot copy.
 */
export function usePresentJarKeys(): JarKey[] {
    const { householdId } = useAuth();
    const live = isLiveData(householdId);
    const jarsQuery = useLiveQuery(
        apiQuery.money.jars.list.queryOptions({ input: { householdId: householdId! } }),
        [] as never,
        live
    );
    return useMemo(() => (jarsQuery.data ?? []).map(jar => jar.key), [jarsQuery.data]);
}

/**
 * One pot, one name: returns the display name of a jar for the current locale.
 * Use it at every place a jar name is rendered, so the board, the jar page, selects and toasts agree.
 * A name the household typed wins; a seed default follows the household's shape: the group name
 * ("Basics") while the pot is the only one in its group, `features.money.jars.names.<KEY>`
 * ("Fixed costs") once the group is refined or while the pot list is still loading.
 * Inputs that EDIT a custom name keep showing the stored value and don't use this.
 */
export function useJarName(): (jar: JarNameSource) => string {
    const tJars = useTranslations('features.money.jars');
    const tGroups = useTranslations('features.money.groups');
    const presentKeys = usePresentJarKeys();
    return useCallback(
        (jar: JarNameSource) =>
            resolvePotName({ jars: tJars, groups: tGroups }, jar.key, jar.name, presentKeys),
        [tJars, tGroups, presentKeys]
    );
}

/** The one literal line under a pot name; same alone-vs-refined rule as {@link useJarName}. */
export function useJarPurpose(): (jarKey: JarKey | string) => string {
    const tJars = useTranslations('features.money.jars');
    const tGroups = useTranslations('features.money.groups');
    const presentKeys = usePresentJarKeys();
    return useCallback(
        (jarKey: JarKey | string) =>
            resolvePotPurpose({ jars: tJars, groups: tGroups }, jarKey, presentKeys),
        [tJars, tGroups, presentKeys]
    );
}
