'use client';

import { use } from 'react';

import { GoalUpdateModalShell } from '@/components/layout/create-route-modals';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return <GoalUpdateModalShell closeHref="/product/growth/goals" id={id} />;
}
