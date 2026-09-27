'use client';

import { use } from 'react';

import { AssetUpdateModalShell } from '@/components/layout/create-route-modals';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return <AssetUpdateModalShell closeHref="/product/growth/net-worth" id={id} />;
}
