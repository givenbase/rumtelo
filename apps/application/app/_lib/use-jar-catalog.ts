'use client';

import { useMemo } from 'react';

import { useLiveQuery } from '@rumtelo/hooks';
import type { JarGuide, JarKey, JarTemplate } from '@rumtelo/contracts';

import { apiQuery } from '@/app/_lib/api-hooks';
import { jarChrome } from '@/app/_lib/jar-meta';
import { isLiveData } from '@/app/_lib/preview';
import { useAuth } from '@/components/features/shell/auth-provider';

export type JarCatalogEntry = JarTemplate & {
    color: string;
    text: string;
    pct: number;
};

/** Active jar templates from the company catalog, with client chrome tokens. */
export function useJarCatalog(): {
    jars: JarCatalogEntry[];
    byKey: Map<JarKey, JarCatalogEntry>;
    guideFor: (key: JarKey) => JarGuide | null;
    ready: boolean;
} {
    const { householdId } = useAuth();
    const live = isLiveData(householdId);
    const query = useLiveQuery(
        apiQuery.money.catalogs.jarTemplates.list.queryOptions({
            input: { householdId: householdId! },
        }),
        [],
        live
    );

    const jars = useMemo((): JarCatalogEntry[] => {
        return (query.data ?? []).map(template => {
            const chrome = jarChrome(template.key);
            return {
                ...template,
                color: chrome.color,
                text: chrome.text,
                pct: template.percentage,
            };
        });
    }, [query.data]);

    const byKey = useMemo(() => new Map(jars.map(jar => [jar.key, jar])), [jars]);

    return {
        jars,
        byKey,
        guideFor: key => byKey.get(key)?.guide ?? null,
        ready: Boolean(query.data),
    };
}
