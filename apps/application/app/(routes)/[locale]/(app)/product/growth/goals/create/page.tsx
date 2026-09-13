'use client';

import { useSearchParams } from 'next/navigation';

import { goalKindFromParams } from '@/app/_lib/create-prefill';
import { formRoute } from '@/app/_lib/form-route-meta';
import { FormRoutePageShell } from '@/components/layout/form-route-page-shell';
import { GoalCreatePage } from '../_components/goal-pages';

export default function Page() {
    const searchParams = useSearchParams();
    const meta = formRoute('goalCreate');

    return (
        <FormRoutePageShell
            title={meta.title}
            description={meta.description}
            closeHref={meta.closeHref}
            width={meta.width}>
            <GoalCreatePage embedded defaultKind={goalKindFromParams(searchParams)} />
        </FormRoutePageShell>
    );
}
