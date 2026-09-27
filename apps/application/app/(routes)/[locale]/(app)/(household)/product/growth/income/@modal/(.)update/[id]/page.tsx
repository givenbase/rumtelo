'use client';

import { use } from 'react';

import { IncomeUpdateModalShell } from '@/components/layout/create-route-modals';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return <IncomeUpdateModalShell closeHref="/product/growth/income" id={id} />;
}
