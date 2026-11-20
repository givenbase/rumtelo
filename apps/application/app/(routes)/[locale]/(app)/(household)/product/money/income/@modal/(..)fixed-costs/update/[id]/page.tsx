'use client';

import { use } from 'react';

import { FixedCostUpdateModalShell } from '@/components/layout/create-route-modals';

/** Intercepts /money/fixed-costs/update/[id] from Income (Other regular income rows). */
export default function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return <FixedCostUpdateModalShell closeHref="/product/money/income" id={id} />;
}
