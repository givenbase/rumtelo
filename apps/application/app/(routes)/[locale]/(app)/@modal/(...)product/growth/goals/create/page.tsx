'use client';

import { useSearchParams } from 'next/navigation';

import { goalKindFromParams } from '@/app/_lib/create-prefill';
import { GoalCreateModalShell } from '@/components/layout/create-route-modals';

export default function Page() {
    const searchParams = useSearchParams();
    return (
        <GoalCreateModalShell
            closeHref="/product/growth/goals"
            defaultKind={goalKindFromParams(searchParams)}
        />
    );
}
