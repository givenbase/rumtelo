'use client';

import { useSearchParams } from 'next/navigation';

import { fixedCostPrefillFromParams } from '@/app/_lib/create-prefill';
import { FixedCostCreateModalShell } from '@/components/layout/create-route-modals';

/** Intercepts /money/fixed-costs/create from Income (Other regular income, `?direction=in`). */
export default function Page() {
    const searchParams = useSearchParams();
    return (
        <FixedCostCreateModalShell
            closeHref="/product/money/income"
            defaultValues={fixedCostPrefillFromParams(searchParams)}
        />
    );
}
