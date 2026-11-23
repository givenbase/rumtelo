'use client';

import { useCallback, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
    HouseholdPermissionAction,
    HouseholdPermissionSection,
    JAR_MAIN_KEY_BY_GROUP,
    jarGroupFor,
    roleCan,
    type Jar,
    type JarKey,
    type OptionalJarKey,
} from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations } from '@rumtelo/i18n';
import { extractApiErrorPayload, parseApiUserMessage } from '@rumtelo/utils';

import { api } from '@/app/_lib/api';
import { useApiError } from '@/app/_lib/api-error-messages';
import { apiQuery } from '@/app/_lib/api-hooks';
import { resolvePotName } from '@/app/_lib/jar-copy';
import { isLiveData } from '@/app/_lib/preview';
import { useBoardWriteAccess } from '@/app/_lib/use-board-write-access';
import { useAuth } from '@/components/features/shell/auth-provider';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';

/**
 * Who may turn pots on and off: the money update right, mirroring the server (`activate` and
 * `deactivate` are money updates). Unknown membership and Practice preview count as "no", so a
 * VIEWER never sees a button flash while members load.
 */
export function useCanRefinePots(): boolean {
    const { membershipRole, practicePreview } = useBoardWriteAccess();
    if (practicePreview || membershipRole === null) return false;
    return roleCan(
        membershipRole,
        HouseholdPermissionSection.MONEY,
        HouseholdPermissionAction.UPDATE
    );
}

/** Backend error keys that have a one-next-move text of their own in `groups.refine`. */
function apiErrorKey(error: unknown): string | null {
    const payload = extractApiErrorPayload(error);
    if (!payload) return null;
    return (
        parseApiUserMessage(payload.message, { code: payload.code, params: payload.params })?.key ??
        null
    );
}

/**
 * Turn optional pots on and off. One place for the mutation, the refresh of everything that
 * lists pots, the toast and the error copy, so settings, the pot page and Giving behave alike.
 * The jar list is read through the shared query, so no extra request pattern.
 */
export function usePotActivation() {
    const queryClient = useQueryClient();
    const { householdId } = useAuth();
    const { showToast } = useHouseholdShell();
    const apiError = useApiError();
    const tJars = useTranslations('features.money.jars');
    const tGroups = useTranslations('features.money.groups');
    const canRefine = useCanRefinePots();
    const live = isLiveData(householdId);

    const jarsQuery = useLiveQuery(
        apiQuery.money.jars.list.queryOptions({ input: { householdId: householdId! } }),
        [] as never,
        live
    );
    const jars: readonly Jar[] = useMemo(() => jarsQuery.data ?? [], [jarsQuery.data]);

    const translators = useMemo(() => ({ jars: tJars, groups: tGroups }), [tJars, tGroups]);

    /**
     * Name of a pot as it reads once `presentKeys` is the household's shape. A pot the list
     * does not hold yet (just turned on) has a seed-default name, so it gets the per-pot name.
     */
    const nameIn = useCallback(
        (key: JarKey, presentKeys: readonly JarKey[], storedName?: string) => {
            const stored = storedName ?? jars.find(jar => jar.key === key)?.name;
            if (stored === undefined) return tJars(`names.${key}`);
            return resolvePotName(translators, key, stored, presentKeys);
        },
        [jars, tJars, translators]
    );

    const refresh = useCallback(() => {
        void queryClient.invalidateQueries({ queryKey: apiQuery.money.jars.list.key() });
        void queryClient.invalidateQueries({ queryKey: apiQuery.money.jars.balances.key() });
        void queryClient.invalidateQueries({ queryKey: apiQuery.money.dashboard.key() });
        void queryClient.invalidateQueries({ queryKey: apiQuery.money.fixedCosts.byJar.key() });
    }, [queryClient]);

    /** Error text: the two refine errors speak in pot names; anything else uses the shared helper. */
    const errorText = useCallback(
        (error: unknown, key: JarKey, presentKeys: readonly JarKey[]) => {
            const group = jarGroupFor(key);
            const mainKey = JAR_MAIN_KEY_BY_GROUP[group];
            const errorKey = apiErrorKey(error);
            if (errorKey === 'jar_not_empty') {
                return tGroups('refine.turn_off_blocked', {
                    pot: nameIn(key, presentKeys),
                    main: nameIn(mainKey, presentKeys),
                });
            }
            if (errorKey === 'jar_share_too_small') {
                return tGroups('refine.share_too_small', {
                    main: nameIn(mainKey, presentKeys),
                    group: tGroups(`${group}.title`),
                });
            }
            return apiError(error);
        },
        [apiError, nameIn, tGroups]
    );

    const activate = useMutation({
        mutationFn: async (key: OptionalJarKey) => {
            if (!householdId) throw new Error('No household');
            return api.money.jars.activate({ householdId, key });
        },
        onSuccess: (jar, key) => {
            refresh();
            // The group is refined from now on, so the pot reads as its own name.
            const presentKeys = [...jars.map(row => row.key), key];
            showToast(
                tGroups('refine.toast_turned_on', { pot: nameIn(key, presentKeys, jar.name) }),
                'success'
            );
        },
        onError: (error, key) =>
            showToast(
                errorText(
                    error,
                    key,
                    jars.map(jar => jar.key)
                ),
                'error'
            ),
    });

    const deactivate = useMutation({
        mutationFn: async (jar: Pick<Jar, 'id' | 'key'>) => {
            if (!householdId) throw new Error('No household');
            return api.money.jars.deactivate({ householdId, jarId: jar.id });
        },
        onSuccess: (_result, jar) => {
            refresh();
            const before = jars.map(row => row.key);
            const after = before.filter(key => key !== jar.key);
            const mainKey = JAR_MAIN_KEY_BY_GROUP[jarGroupFor(jar.key)];
            showToast(
                tGroups('refine.toast_turned_off', {
                    // The name as it was, then the main pot as it reads now (maybe the group name again).
                    pot: nameIn(jar.key, before),
                    main: nameIn(mainKey, after),
                }),
                'success'
            );
        },
        onError: (error, jar) =>
            showToast(
                errorText(
                    error,
                    jar.key,
                    jars.map(row => row.key)
                ),
                'error'
            ),
    });

    return {
        canRefine,
        jars,
        jarsLoaded: live && !jarsQuery.isPending,
        activate,
        deactivate,
        isPending: activate.isPending || deactivate.isPending,
        nameIn,
    };
}
