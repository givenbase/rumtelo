'use client';

import { useSearchParams } from 'next/navigation';

import { fixedCostPrefillFromParams } from '@/app/_lib/create-prefill';
import { FixedCostCreateModalShell } from '@/components/layout/create-route-modals';

/** Quick Add + cross-route: fixed cost create, optionally pre-filled (Soul → Giving). */
export default function Page() {
    const searchParams = useSearchParams();
    return (
        <FixedCostCreateModalShell
            closeHref="/product/money/fixed-costs"
            defaultValues={fixedCostPrefillFromParams(searchParams)}
        />
    );
}
