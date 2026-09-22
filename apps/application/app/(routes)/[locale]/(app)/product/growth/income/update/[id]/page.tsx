import { getTranslations } from '@rumtelo/i18n';

import { formRoute } from '@/app/_lib/form-route-meta';
import { FormRoutePageShell } from '@/components/layout/form-route-page-shell';
import { IncomeUpdatePage } from '../../_components/income-pages';

export async function generateMetadata() {
    const t = await getTranslations();
    return { title: t(formRoute('incomeUpdate').titleKey) };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const meta = formRoute('incomeUpdate');

    return (
        <FormRoutePageShell meta={meta}>
            <IncomeUpdatePage id={id} embedded />
        </FormRoutePageShell>
    );
}
