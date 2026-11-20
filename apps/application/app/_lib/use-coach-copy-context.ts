'use client';

import { JarKey } from '@rumtelo/contracts';

import type { CoachCopyContext } from '@/app/_lib/coach-message-copy';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import { useJarCatalog } from '@/app/_lib/use-jar-catalog';

/** Money formatter and jar name that Coach sentences with numbers need, from the household. */
export function useCoachCopyContext(): CoachCopyContext {
    const { formatMoney } = useHouseholdCurrency();
    const { byKey } = useJarCatalog();
    return {
        formatMoney,
        necessitiesJarName: byKey.get(JarKey.NECESSITIES)?.name ?? null,
    };
}
