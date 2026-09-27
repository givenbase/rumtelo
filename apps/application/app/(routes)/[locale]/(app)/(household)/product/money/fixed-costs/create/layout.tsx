import { formRouteMetadata } from '@/app/_lib/form-route-meta';

export async function generateMetadata() {
    return formRouteMetadata('fixedCreate');
}

export default function FixedCostCreateLayout({ children }: { children: React.ReactNode }) {
    return children;
}
