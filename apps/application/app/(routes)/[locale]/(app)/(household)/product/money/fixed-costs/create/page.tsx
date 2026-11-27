'use client';

import { useSearchParams } from 'next/navigation';

import { FlowDirection } from '@rumtelo/contracts';

import { fixedCostPrefillFromParams } from '@/app/_lib/create-prefill';
import { formRoute } from '@/app/_lib/form-route-meta';
import { FormRoutePageShell } from '@/components/layout/form-route-page-shell';
import { FixedCostCreatePage } from '../_components/fixed-cost-pages';

export default function Page() {
    const searchParams = useSearchParams();
    const prefill = fixedCostPrefillFromParams(searchParams);
    // `?direction=in` is Income › Other regular income: its own title and way back.
    const meta = formRoute(
        prefill?.direction === FlowDirection.IN ? 'fixedIncomeCreate' : 'fixedCreate'
    );

    return (
        <FormRoutePageShell meta={meta}>
            <FixedCostCreatePage embedded defaultValues={prefill} />
        </FormRoutePageShell>
    );
}
