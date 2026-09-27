import { PracticePreviewCreateGuard } from '@/components/features/shell/practice-preview-create-guard';

/**
 * Soft-nav create/update modals must not be statically prerendered — Next 16.3
 * cannot resolve `[locale]` for `(...)` intercept slots during SSG.
 * Practice preview (VIEW + MANAGE) cannot open create/update flows.
 */
export const dynamic = 'force-dynamic';

export default function ModalSlotLayout({ children }: { children: React.ReactNode }) {
    return <PracticePreviewCreateGuard>{children}</PracticePreviewCreateGuard>;
}
