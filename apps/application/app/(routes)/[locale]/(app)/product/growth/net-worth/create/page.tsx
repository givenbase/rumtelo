import { formRoute } from '@/app/_lib/form-route-meta';
import { AssetForm } from '@/components/features/forms/asset-form';
import { FormRoutePageShell } from '@/components/layout/form-route-page-shell';

export const metadata = { title: formRoute('assetCreate').title };

export default function Page() {
    const meta = formRoute('assetCreate');

    return (
        <FormRoutePageShell
            title={meta.title}
            description={meta.description}
            closeHref={meta.closeHref}
            width={meta.width}>
            <AssetForm embedded />
        </FormRoutePageShell>
    );
}
