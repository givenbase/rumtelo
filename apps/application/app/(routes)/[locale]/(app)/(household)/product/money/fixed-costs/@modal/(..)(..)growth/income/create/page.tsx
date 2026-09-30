'use client';

import { useSearchParams } from 'next/navigation';

import { incomePrefillFromParams } from '@/app/_lib/create-prefill';
import { IncomeCreateModalShell } from '@/components/layout/create-route-modals';

/** Intercepts /growth/income/create from Fixed costs (In tab). */
export default function Page() {
    const searchParams = useSearchParams();
    return (
        <IncomeCreateModalShell
            closeHref="/product/money/fixed-costs"
            defaultValues={incomePrefillFromParams(searchParams)}
        />
    );
}
