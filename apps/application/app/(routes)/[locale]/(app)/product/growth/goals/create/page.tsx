'use client';

import { useSearchParams } from 'next/navigation';

import { goalKindFromParams, goalJarIdFromParams } from '@/app/_lib/create-prefill';
import { formRoute } from '@/app/_lib/form-route-meta';
import { FormRoutePageShell } from '@/components/layout/form-route-page-shell';
import { GoalCreatePage } from '../_components/goal-pages';

export default function Page() {
    const searchParams = useSearchParams();
    const meta = formRoute('goalCreate');

    return (
        <FormRoutePageShell meta={meta}>
            <GoalCreatePage
                embedded
                defaultKind={goalKindFromParams(searchParams)}
                defaultJarId={goalJarIdFromParams(searchParams)}
            />
        </FormRoutePageShell>
    );
}
