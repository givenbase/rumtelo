'use client';

import type { CoachMessage } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations, type TranslateFn } from '@rumtelo/i18n';
import { toPeriodKey } from '@rumtelo/utils';

import { apiQuery } from '@/app/_lib/api-hooks';
import type { CoachLineCandidate } from '@/app/_lib/coach-line';
import {
    feedMessagesForKeys,
    orderFeedMessagesByKeys,
    secondaryCtaOf,
} from '@/app/_lib/coach-line';
import {
    resolveCoachMessage,
    resolveCoachSecondaryCtaLabel,
    type CoachCopyContext,
} from '@/app/_lib/coach-message-copy';
import { isLiveData } from '@/app/_lib/preview';
import { useCoachCopyContext } from '@/app/_lib/use-coach-copy-context';
import { useAuth } from '@/components/features/shell/auth-provider';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';

type FeedLineMessage = Pick<CoachMessage, 'id' | 'key' | 'text' | 'ctaLabel' | 'ctaHref'> &
    Partial<Pick<CoachMessage, 'ctaSecondaryLabel' | 'ctaSecondaryHref'>>;

type TranslateCoach = (key: string, values?: Record<string, string | number | Date>) => string;

const EMPTY_FEED: CoachMessage[] = [];

/**
 * One feed row as a Coach line candidate. A row without a destination is informational only
 * and never becomes a line (every line carries a move). Texts are localized by rule key.
 */
export function feedLineCandidate(
    message: FeedLineMessage,
    tCoach: TranslateCoach,
    tRoot: TranslateFn,
    context?: CoachCopyContext
): CoachLineCandidate | null {
    if (!message.ctaHref) return null;
    const copy = resolveCoachMessage(message, tCoach, tRoot, context);
    const label = copy.ctaLabel ?? message.ctaLabel;
    if (!label) return null;
    const secondary = secondaryCtaOf(message);
    return {
        id: `feed:${message.id}`,
        text: copy.text,
        cta: { label, href: message.ctaHref },
        secondaryCta: secondary
            ? {
                  label: resolveCoachSecondaryCtaLabel(message, secondary.label, tCoach),
                  href: secondary.href,
              }
            : null,
        dismiss: { kind: 'feed', messageId: message.id },
    };
}

/**
 * Candidates for a page's Coach line from the household's Coach feed, filtered to the rule
 * keys the page owns and ordered by those keys. Empty while loading or when the feed fails:
 * the line sits after the data, so it never shows a skeleton.
 */
export function useCoachFeedCandidates(keyPrefixes: readonly string[]): CoachLineCandidate[] {
    const tCoach = useTranslations('features.coach');
    const tRoot = useTranslations();
    const copyContext = useCoachCopyContext();
    const { householdId } = useAuth();
    const { period } = useHouseholdShell();
    const live = isLiveData(householdId);
    const feedQuery = useLiveQuery(
        apiQuery.coach.feed.queryOptions({
            input: { householdId: householdId!, period: toPeriodKey(period.year, period.month) },
        }),
        EMPTY_FEED,
        live
    );
    if (!live || feedQuery.isError) return [];
    const messages = orderFeedMessagesByKeys(
        feedMessagesForKeys(feedQuery.data, keyPrefixes),
        keyPrefixes
    );
    return messages.flatMap(message => {
        const candidate = feedLineCandidate(message, tCoach, tRoot, copyContext);
        return candidate ? [candidate] : [];
    });
}
