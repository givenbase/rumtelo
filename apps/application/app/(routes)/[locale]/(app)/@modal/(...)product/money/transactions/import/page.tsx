'use client';

import { TxImportModalShell } from '@/components/layout/create-route-modals';

/** Quick Add + cross-route: statement import from outside the list. */
export default function Page() {
    return <TxImportModalShell closeHref="/product/money/transactions" />;
}
