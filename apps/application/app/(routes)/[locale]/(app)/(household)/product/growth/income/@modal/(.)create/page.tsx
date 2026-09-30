'use client';

import { useSearchParams } from 'next/navigation';

import { incomePrefillFromParams } from '@/app/_lib/create-prefill';
import { IncomeCreateModalShell } from '@/components/layout/create-route-modals';

export default function Page() {
    const searchParams = useSearchParams();
    return (
        <IncomeCreateModalShell
            closeHref="/product/growth/income"
            defaultValues={incomePrefillFromParams(searchParams)}
        />
    );
}
