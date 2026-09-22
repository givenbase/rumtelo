import { getTranslations } from '@rumtelo/i18n';

import { formRoute } from '@/app/_lib/form-route-meta';
import { FormRoutePageShell } from '@/components/layout/form-route-page-shell';
import { GoalUpdatePage } from '../../_components/goal-pages';

export async function generateMetadata() {
    const t = await getTranslations();
    return { title: t(formRoute('goalUpdate').titleKey) };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const meta = formRoute('goalUpdate');

    return (
        <FormRoutePageShell meta={meta}>
            <GoalUpdatePage id={id} embedded />
        </FormRoutePageShell>
    );
}
