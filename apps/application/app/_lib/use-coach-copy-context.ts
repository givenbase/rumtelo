'use client';

import { JarKey } from '@rumtelo/contracts';

import type { CoachCopyContext } from '@/app/_lib/coach-message-copy';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import { useJarCatalog } from '@/app/_lib/use-jar-catalog';
import { useJarName } from '@/app/_lib/use-jar-name';

/** Money formatter and jar name that Coach sentences with numbers need, from the household. */
export function useCoachCopyContext(): CoachCopyContext {
    const { formatMoney } = useHouseholdCurrency();
    const { byKey } = useJarCatalog();
    const jarName = useJarName();
    const necessities = byKey.get(JarKey.NECESSITIES);
    return {
        formatMoney,
        necessitiesJarName: necessities ? jarName(necessities) : null,
    };
}
