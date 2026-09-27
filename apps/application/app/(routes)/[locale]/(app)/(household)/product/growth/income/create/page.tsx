import { getTranslations } from '@rumtelo/i18n';

import { formRoute } from '@/app/_lib/form-route-meta';
import { FormRoutePageShell } from '@/components/layout/form-route-page-shell';
import { IncomeCreatePage } from '../_components/income-pages';

export async function generateMetadata() {
    const t = await getTranslations();
    return { title: t(formRoute('incomeCreate').titleKey) };
}

export default function Page() {
    const meta = formRoute('incomeCreate');

    return (
        <FormRoutePageShell meta={meta}>
            <IncomeCreatePage embedded />
        </FormRoutePageShell>
    );
}
