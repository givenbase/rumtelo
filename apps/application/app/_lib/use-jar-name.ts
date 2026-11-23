'use client';

import { useCallback } from 'react';

import type { JarKey } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';

import { resolveJarName } from '@/app/_lib/jar-copy';

/** The two fields every jar-like DTO shares; the key decides whether the stored name is a seed default. */
type JarNameSource = { key: JarKey | string; name: string };

/**
 * One pot, one name: returns the display name of a jar for the current locale.
 * Use it at every place a jar name is rendered, so the board, the jar page, selects and toasts agree.
 * A name the household typed wins; a seed default follows `features.money.jars.names.<KEY>`.
 * Inputs that EDIT a custom name keep showing the stored value and don't use this.
 */
export function useJarName(): (jar: JarNameSource) => string {
    const tJars = useTranslations('features.money.jars');
    return useCallback((jar: JarNameSource) => resolveJarName(tJars, jar.key, jar.name), [tJars]);
}
