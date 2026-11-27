'use client';

import { useTranslations } from '@rumtelo/i18n';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@rumtelo/ui';

import type { YouRow } from '@/app/_lib/nav';

import { YouPanel } from './you-panel';
import type { YouRowActions } from './you-rows';

/**
 * Phone "You": a bottom sheet with the same body as the desktop avatar menu. Radix Dialog
 * semantics: focus is trapped, Escape and the close button close it, and focus returns to
 * the You tab. Rows are 48 px tall.
 */
export function YouSheet({
    open,
    onOpenChange,
    rows,
    pathname,
    actions,
    isViewer,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    rows: readonly YouRow[];
    pathname: string;
    actions: YouRowActions;
    isViewer: boolean;
}) {
    const t = useTranslations();

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="bottom"
                aria-describedby={undefined}
                closeLabel={t('pages.nav.you.close')}
                className="max-h-[85dvh] gap-0 overflow-y-auto rounded-t-2xl pb-[env(safe-area-inset-bottom)] md:hidden">
                <SheetHeader className="px-5 pt-5 pr-14 pb-2 text-left">
                    <SheetTitle className="text-xl">{t('pages.nav.you.title')}</SheetTitle>
                </SheetHeader>
                <YouPanel
                    rows={rows}
                    pathname={pathname}
                    actions={actions}
                    isViewer={isViewer}
                    tall
                />
            </SheetContent>
        </Sheet>
    );
}
