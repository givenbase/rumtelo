'use client';

import { useSearchParams } from 'next/navigation';

import { assetKindFromParams } from '@/app/_lib/create-prefill';
import { formRoute } from '@/app/_lib/form-route-meta';
import { AssetForm } from '@/components/features/forms/asset-form';
import { FormRoutePageShell } from '@/components/layout/form-route-page-shell';

export default function Page() {
    const searchParams = useSearchParams();
    const meta = formRoute('assetCreate');

    return (
        <FormRoutePageShell meta={meta}>
            <AssetForm embedded lockedKind={assetKindFromParams(searchParams)} />
        </FormRoutePageShell>
    );
}
