import { getTranslations } from '@rumtelo/i18n';

import { formRoute } from '@/app/_lib/form-route-meta';
import { SheetStubForm } from '@/components/features/forms/sheet-stub-form';
import { FormRoutePageShell } from '@/components/layout/form-route-page-shell';

export async function generateMetadata() {
    const t = await getTranslations();
    return { title: t(formRoute('sessionCreate').titleKey) };
}

export default function Page() {
    const meta = formRoute('sessionCreate');

    return (
        <FormRoutePageShell meta={meta}>
            <SheetStubForm kind="session" mode="create" embedded />
        </FormRoutePageShell>
    );
}
