'use client';

import { useSearchParams } from 'next/navigation';

import type { TxDirection } from '@/app/_lib/create-routes';
import { txPrefillFromParams } from '@/app/_lib/create-prefill';
import { TxCreateModalShell } from '@/components/layout/create-route-modals';

function parseDirection(value: string | null): TxDirection {
    return value === 'in' ? 'in' : 'out';
}

/** Quick Add + cross-route: transaction create from outside the list. */
export default function Page() {
    const searchParams = useSearchParams();
    const prefill = txPrefillFromParams(searchParams);
    const direction = parseDirection(searchParams.get('direction'));

    return (
        <TxCreateModalShell
            closeHref="/product/money/transactions"
            defaultJarId={prefill?.jarId}
            direction={direction}
            defaultValues={prefill}
        />
    );
}
