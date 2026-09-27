'use client';

import { useSearchParams } from 'next/navigation';

import { MoveMoneyCreateModalShell } from '@/components/layout/create-route-modals';

function safeReturnTo(value: string | null): string {
    if (value && value.startsWith('/product/money/jars')) return value;
    return '/product/money/jars';
}

/** Intercepts /money/jars/move/create from the jars section. */
export default function Page() {
    const searchParams = useSearchParams();
    const fromJarId = searchParams.get('fromJarId') ?? undefined;
    const returnTo = safeReturnTo(searchParams.get('returnTo'));

    return <MoveMoneyCreateModalShell closeHref={returnTo} defaultFromJarId={fromJarId} />;
}
