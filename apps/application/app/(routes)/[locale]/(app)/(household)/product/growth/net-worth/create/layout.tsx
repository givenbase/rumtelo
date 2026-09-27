import { formRouteMetadata } from '@/app/_lib/form-route-meta';

export async function generateMetadata() {
    return formRouteMetadata('assetCreate');
}

export default function AssetCreateLayout({ children }: { children: React.ReactNode }) {
    return children;
}
