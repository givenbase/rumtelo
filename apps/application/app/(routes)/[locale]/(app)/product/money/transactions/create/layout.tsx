import { formRouteMetadata } from '@/app/_lib/form-route-meta';

export async function generateMetadata() {
    return formRouteMetadata('txCreate');
}

export default function TransactionCreateLayout({ children }: { children: React.ReactNode }) {
    return children;
}
