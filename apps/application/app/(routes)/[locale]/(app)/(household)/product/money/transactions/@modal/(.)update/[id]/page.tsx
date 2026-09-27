'use client';

import { use } from 'react';

import { TxUpdateModalShell } from '@/components/layout/create-route-modals';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return <TxUpdateModalShell closeHref="/product/money/transactions" id={id} />;
}
