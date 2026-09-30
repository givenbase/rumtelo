'use client';

import { useSearchParams } from 'next/navigation';

import { incomePrefillFromParams } from '@/app/_lib/create-prefill';
import { IncomeCreateModalShell } from '@/components/layout/create-route-modals';

/** Intercepts /growth/income/create from an asset detail (holding locked via ?assetId=). */
export default function Page() {
    const searchParams = useSearchParams();
    return (
        <IncomeCreateModalShell
            closeHref="/product/growth/net-worth"
            defaultValues={incomePrefillFromParams(searchParams)}
        />
    );
}
