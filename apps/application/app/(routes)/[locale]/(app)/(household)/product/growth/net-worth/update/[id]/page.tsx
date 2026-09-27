import { getTranslations } from '@rumtelo/i18n';

import { formRoute } from '@/app/_lib/form-route-meta';
import { FormRoutePageShell } from '@/components/layout/form-route-page-shell';
import { AssetUpdatePage } from '../../_components/asset-pages';

export async function generateMetadata() {
    const t = await getTranslations();
    return { title: t(formRoute('assetUpdate').titleKey) };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const meta = formRoute('assetUpdate');

    return (
        <FormRoutePageShell meta={meta}>
            <AssetUpdatePage id={id} embedded />
        </FormRoutePageShell>
    );
}
