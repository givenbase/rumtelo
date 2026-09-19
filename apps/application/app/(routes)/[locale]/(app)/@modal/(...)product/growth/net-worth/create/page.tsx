'use client';

import { useSearchParams } from 'next/navigation';

import { assetKindFromParams } from '@/app/_lib/create-prefill';
import { AssetCreateModalShell } from '@/components/layout/create-route-modals';

export default function Page() {
    const searchParams = useSearchParams();
    return (
        <AssetCreateModalShell
            closeHref="/product/growth/net-worth"
            lockedKind={assetKindFromParams(searchParams)}
        />
    );
}
