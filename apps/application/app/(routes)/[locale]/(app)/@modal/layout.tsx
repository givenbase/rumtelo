import { BoardMutateRouteGuard } from '@/components/features/shell/board-mutate-route-guard';

/**
 * Soft-nav create/update modals must not be statically prerendered — Next 16.3
 * cannot resolve `[locale]` for `(...)` intercept slots during SSG.
 * Read-only boards (Practice preview + household VIEWER) cannot open mutate flows.
 */
export const dynamic = 'force-dynamic';

export default function ModalSlotLayout({ children }: { children: React.ReactNode }) {
    return <BoardMutateRouteGuard>{children}</BoardMutateRouteGuard>;
}
