import { formRouteMetadata } from '@/app/_lib/form-route-meta';

export async function generateMetadata() {
    return formRouteMetadata('goalCreate');
}

export default function GoalCreateLayout({ children }: { children: React.ReactNode }) {
    return children;
}
