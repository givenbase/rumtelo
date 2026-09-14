import type { CoachMessage } from '@rumtelo/contracts';

import type { PortalHubProps } from '@/components/features/home/portal-hub';

type PortalCoachMessage = Pick<CoachMessage, 'kind' | 'text' | 'ctaLabel' | 'ctaHref'>;

export function pickPortalCoach(
    messages: ReadonlyArray<PortalCoachMessage>,
    fallback: PortalHubProps['coach']
): PortalHubProps['coach'] {
    const tip = messages[0];
    if (!tip) return fallback;
    return {
        dot: fallback.dot,
        kind: tip.kind.replaceAll('_', ' '),
        text: tip.text,
        cta: tip.ctaLabel ?? fallback.cta,
        href: tip.ctaHref ?? fallback.href,
    };
}
