'use client';

import { useSearchParams } from 'next/navigation';

import { fixedCostPrefillFromParams } from '@/app/_lib/create-prefill';
import { formRoute } from '@/app/_lib/form-route-meta';
import { FormRoutePageShell } from '@/components/layout/form-route-page-shell';
import { FixedCostCreatePage } from '../_components/fixed-cost-pages';

export default function Page() {
    const searchParams = useSearchParams();
    const meta = formRoute('fixedCreate');

    return (
        <FormRoutePageShell
            title={meta.title}
            description={meta.description}
            closeHref={meta.closeHref}
            width={meta.width}>
            <FixedCostCreatePage
                embedded
                defaultValues={fixedCostPrefillFromParams(searchParams)}
            />
        </FormRoutePageShell>
    );
}
