'use client';

import { useSearchParams } from 'next/navigation';

import { fixedCostPrefillFromParams } from '@/app/_lib/create-prefill';
import { FixedCostCreateModalShell } from '@/components/layout/create-route-modals';

/** Soft-nav create from within fixed-costs (and cross-route prefill query). */
export default function Page() {
    const searchParams = useSearchParams();
    return (
        <FixedCostCreateModalShell
            closeHref="/product/money/fixed-costs"
            defaultValues={fixedCostPrefillFromParams(searchParams)}
        />
    );
}
