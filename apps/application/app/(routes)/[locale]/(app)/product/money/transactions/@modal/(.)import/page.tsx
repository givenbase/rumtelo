'use client';

import { TxImportModalShell } from '@/components/layout/create-route-modals';

/** Soft intercept from Transactions list → import sheet. */
export default function Page() {
    return <TxImportModalShell closeHref="/product/money/transactions" />;
}
