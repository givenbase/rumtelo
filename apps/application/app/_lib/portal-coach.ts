import type { CoachMessage } from '@rumtelo/contracts';
import type { TranslateFn } from '@rumtelo/i18n';

import { resolveCoachMessage } from '@/app/_lib/coach-message-copy';
import type { PortalHubProps } from '@/components/features/home/portal-hub';

type PortalCoachMessage = Pick<CoachMessage, 'key' | 'kind' | 'text' | 'ctaLabel' | 'ctaHref'>;

type TranslateCoach = (key: string, values?: Record<string, string | number | Date>) => string;

export function pickPortalCoach(
    messages: ReadonlyArray<PortalCoachMessage>,
    fallback: PortalHubProps['coach'],
    t: TranslateCoach,
    tDuration?: TranslateFn
): PortalHubProps['coach'] {
    const tip = messages[0];
    if (!tip) return fallback;
    const copy = resolveCoachMessage(tip, t, tDuration);
    return {
        dot: fallback.dot,
        kind: tip.kind,
        text: copy.text,
        cta: copy.ctaLabel ?? fallback.cta,
        href: tip.ctaHref ?? fallback.href,
    };
}
