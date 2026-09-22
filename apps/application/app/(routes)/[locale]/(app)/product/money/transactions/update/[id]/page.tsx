import { getTranslations } from '@rumtelo/i18n';

import { formRoute } from '@/app/_lib/form-route-meta';
import { FormRoutePageShell } from '@/components/layout/form-route-page-shell';
import { ExpenseUpdatePage } from '../../_components/expense-pages';

export async function generateMetadata() {
    const t = await getTranslations();
    return { title: t(formRoute('txUpdate').titleKey) };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const meta = formRoute('txUpdate');

    return (
        <FormRoutePageShell meta={meta}>
            <ExpenseUpdatePage id={id} embedded />
        </FormRoutePageShell>
    );
}
