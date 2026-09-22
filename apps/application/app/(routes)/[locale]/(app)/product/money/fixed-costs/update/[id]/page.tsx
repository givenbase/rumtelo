import { getTranslations } from '@rumtelo/i18n';

import { formRoute } from '@/app/_lib/form-route-meta';
import { FormRoutePageShell } from '@/components/layout/form-route-page-shell';
import { FixedCostUpdatePage } from '../../_components/fixed-cost-pages';

export async function generateMetadata() {
    const t = await getTranslations();
    return { title: t(formRoute('fixedUpdate').titleKey) };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const meta = formRoute('fixedUpdate');

    return (
        <FormRoutePageShell meta={meta}>
            <FixedCostUpdatePage id={id} embedded />
        </FormRoutePageShell>
    );
}
