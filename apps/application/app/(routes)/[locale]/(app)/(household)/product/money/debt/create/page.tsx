import { getTranslations } from '@rumtelo/i18n';

import { formRoute } from '@/app/_lib/form-route-meta';
import { FormRoutePageShell } from '@/components/layout/form-route-page-shell';
import { DebtCreatePage } from '../_components/debt-pages';

export async function generateMetadata() {
    const t = await getTranslations();
    return { title: t(formRoute('debtCreate').titleKey) };
}

export default function Page() {
    const meta = formRoute('debtCreate');

    return (
        <FormRoutePageShell meta={meta}>
            <DebtCreatePage embedded />
        </FormRoutePageShell>
    );
}
