'use client';

import { useSearchParams } from 'next/navigation';

import { formRoute, moveCreateMeta } from '@/app/_lib/form-route-meta';
import { MoveMoneyForm } from '@/components/features/forms/move-money-form';
import { FormRoutePageShell } from '@/components/layout/form-route-page-shell';

export default function Page() {
    const searchParams = useSearchParams();
    const fromJarId = searchParams.get('fromJarId') ?? undefined;
    const returnTo = searchParams.get('returnTo');
    const meta = moveCreateMeta(fromJarId);

    return (
        <FormRoutePageShell meta={meta} closeHref={returnTo || formRoute('moveCreate').closeHref}>
            <MoveMoneyForm embedded defaultFromJarId={fromJarId} />
        </FormRoutePageShell>
    );
}
