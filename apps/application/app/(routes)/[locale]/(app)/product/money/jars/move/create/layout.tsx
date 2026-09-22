import { formRouteMetadata } from '@/app/_lib/form-route-meta';

export async function generateMetadata() {
    return formRouteMetadata('moveCreate');
}

export default function MoveCreateLayout({ children }: { children: React.ReactNode }) {
    return children;
}
