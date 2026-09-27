import { formRouteMetadata } from '@/app/_lib/form-route-meta';

export async function generateMetadata() {
    return formRouteMetadata('txImport');
}

export default function TransactionImportLayout({ children }: { children: React.ReactNode }) {
    return children;
}
