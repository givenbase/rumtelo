'use client';

import { IncomeCreateModalShell } from '@/components/layout/create-route-modals';

/** Intercepts /growth/income/create from Fixed costs (In tab). */
export default function Page() {
    return <IncomeCreateModalShell closeHref="/product/money/fixed-costs" />;
}
