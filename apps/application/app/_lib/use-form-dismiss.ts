'use client';

import { useCallback } from 'react';

import { useRouter } from 'next/navigation';

type FormDismissOptions = {
    /**
     * List URL after delete. Prefer this over `router.back()` so we never land on
     * the deleted entity’s detail (edit opened from detail → back would stay there).
     */
    listHref?: string;
};

/**
 * After create/edit success: optional onSuccess, else router.back()
 * (soft intercept sheet or full-page history).
 *
 * After remove: optional onSuccess, else replace to `listHref` when set —
 * never leave the user on a deleted detail page.
 */
export function useFormDismiss(onSuccess?: () => void, options?: FormDismissOptions) {
    const router = useRouter();
    const listHref = options?.listHref;

    const dismiss = useCallback(() => {
        if (onSuccess) {
            onSuccess();
            return;
        }
        router.back();
    }, [onSuccess, router]);

    const dismissAfterRemove = useCallback(() => {
        if (onSuccess) {
            onSuccess();
            return;
        }
        if (listHref) {
            router.replace(listHref);
            return;
        }
        router.back();
    }, [listHref, onSuccess, router]);

    return { dismiss, dismissAfterRemove };
}
