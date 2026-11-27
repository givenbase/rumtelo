'use client';

import { useLiveQuery } from '@rumtelo/hooks';

import { apiQuery } from '@/app/_lib/api-hooks';
import { isLiveData } from '@/app/_lib/preview';
import { useAuth } from '@/components/features/shell/auth-provider';
import { usePracticePreview } from '@/components/features/shell/practice-preview';

/**
 * The signed-in person's own direction ("Where you're going"), for the places that show it back.
 *
 * Personal on purpose: it reads the account settings of whoever is signed in, never a household
 * query, and it returns null in a Practice preview (that screen is a client's board, and the
 * coach's own words do not belong in it). The query is the same one the Mindset page and the
 * shell already use, so this adds no request.
 */
export function useMyDirection(): string | null {
    const { householdId } = useAuth();
    const { capabilities } = usePracticePreview();
    const query = useLiveQuery(
        apiQuery.account.settings.queryOptions(),
        null,
        isLiveData(householdId) && !capabilities.active
    );
    const direction = query.data?.direction?.trim();
    return direction ? direction : null;
}
