'use client';

import { useTranslations } from '@rumtelo/i18n';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@rumtelo/ui';

import type { MoreRow } from '@/app/_lib/nav';

import { MoreRows, type MoreRowActions } from './more-rows';

/**
 * Phone "More": a bottom sheet with the same rows as the desktop menu. Radix Dialog
 * semantics: focus is trapped, the first row gets focus, Escape and the close button
 * close it, and focus returns to the More tab. Rows are 48 px tall.
 */
export function MoreSheet({
    open,
    onOpenChange,
    rows,
    pathname,
    actions,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    rows: readonly MoreRow[];
    pathname: string;
    actions: MoreRowActions;
}) {
    const t = useTranslations();

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="bottom"
                aria-describedby={undefined}
                closeLabel={t('pages.nav.more.close')}
                className="max-h-[85dvh] gap-0 overflow-y-auto rounded-t-2xl pb-[env(safe-area-inset-bottom)] md:hidden">
                <SheetHeader className="px-5 pt-5 pr-14 pb-2 text-left">
                    <SheetTitle className="text-xl">{t('pages.nav.more.title')}</SheetTitle>
                </SheetHeader>
                <div className="grid gap-0.5 px-2 pb-4">
                    <MoreRows rows={rows} pathname={pathname} variant="sheet" actions={actions} />
                </div>
            </SheetContent>
        </Sheet>
    );
}
