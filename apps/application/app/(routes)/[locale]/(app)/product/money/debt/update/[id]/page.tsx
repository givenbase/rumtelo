import { getTranslations } from '@rumtelo/i18n';

import { formRoute } from '@/app/_lib/form-route-meta';
import { FormRoutePageShell } from '@/components/layout/form-route-page-shell';
import { DebtUpdatePage } from '../../_components/debt-pages';

export async function generateMetadata() {
    const t = await getTranslations();
    return { title: t(formRoute('debtUpdate').titleKey) };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const meta = formRoute('debtUpdate');

    return (
        <FormRoutePageShell meta={meta}>
            <DebtUpdatePage id={id} embedded />
        </FormRoutePageShell>
    );
}
