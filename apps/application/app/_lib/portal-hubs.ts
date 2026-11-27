/**
 * Portal overview chrome — titles, routes, colors.
 * Live card values come from each product's dashboard API (see portal-hub clients).
 */
import type { TranslateFn } from '@rumtelo/i18n';

import type { PortalHubProps } from '@/components/features/home/portal-hub';

type PortalShell = Omit<PortalHubProps, 'cards'>;

export function moneyPortalShell(t: TranslateFn): PortalShell {
    return {
        tint: 'var(--color-jar-give)',
        icon: '◈',
        eyebrow: t('features.money.hub.eyebrow'),
        title: t('features.money.hub.title'),
        line: t('features.money.hub.line'),
    };
}

export function energyPortalShell(t: TranslateFn): PortalShell {
    return {
        tint: 'var(--color-jar-play)',
        icon: '✳\uFE0E',
        eyebrow: t('features.energy.hub.eyebrow'),
        title: t('features.energy.hub.title'),
        line: t('features.energy.hub.line'),
    };
}

export function soulPortalShell(t: TranslateFn): PortalShell {
    return {
        tint: 'var(--color-portal-soul)',
        icon: '✦',
        eyebrow: t('features.soul.hub.eyebrow'),
        title: t('features.soul.hub.title'),
        line: t('features.soul.hub.line'),
    };
}
