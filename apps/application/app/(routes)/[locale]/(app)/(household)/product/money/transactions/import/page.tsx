'use client';

import { formRoute } from '@/app/_lib/form-route-meta';
import { StatementImportCard } from '@/components/features/money/statement-import-card';
import { FormRoutePageShell } from '@/components/layout/form-route-page-shell';

export default function Page() {
    const meta = formRoute('txImport');

    return (
        <FormRoutePageShell meta={meta}>
            <StatementImportCard embedded variant="full" />
        </FormRoutePageShell>
    );
}
