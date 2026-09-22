/**
 * Portal overview chrome — titles, routes, colors.
 * Live card values come from each product's dashboard API (see portal-hub clients).
 */
import type { TranslateFn } from '@rumtelo/i18n';

import type { PortalHubProps } from '@/components/features/home/portal-hub';

type PortalShell = Omit<PortalHubProps, 'coach' | 'cards'> & {
    fallbackCoach: PortalHubProps['coach'];
};

export function moneyPortalShell(t: TranslateFn): PortalShell {
    return {
        tint: 'var(--color-jar-give)',
        icon: '◈',
        eyebrow: t('features.money.hub.eyebrow'),
        title: t('features.money.hub.title'),
        line: t('features.money.hub.line'),
        fallbackCoach: {
            dot: 'var(--color-accent)',
            kind: t('features.money.hub.fallback_coach_kind'),
            text: t('features.money.hub.fallback_coach_text'),
            cta: t('features.money.hub.fallback_coach_cta'),
            href: '/product/money/jars',
        },
    };
}

export function growthPortalShell(t: TranslateFn): PortalShell {
    return {
        tint: 'var(--color-jar-lts)',
        icon: '↗',
        eyebrow: t('features.growth.hub.eyebrow'),
        title: t('features.growth.hub.title'),
        line: t('features.growth.hub.line'),
        fallbackCoach: {
            dot: 'var(--color-accent)',
            kind: t('features.growth.hub.fallback_coach_kind'),
            text: t('features.growth.hub.fallback_coach_text'),
            cta: t('features.growth.hub.fallback_coach_cta'),
            href: '/product/growth/income',
        },
    };
}

export function energyPortalShell(t: TranslateFn): PortalShell {
    return {
        tint: 'var(--color-jar-play)',
        icon: '✳\uFE0E',
        eyebrow: t('features.energy.hub.eyebrow'),
        title: t('features.energy.hub.title'),
        line: t('features.energy.hub.line'),
        fallbackCoach: {
            dot: 'var(--color-accent)',
            kind: t('features.energy.hub.fallback_coach_kind'),
            text: t('features.energy.hub.fallback_coach_text'),
            cta: t('features.energy.hub.fallback_coach_cta'),
            href: '/product/energy/week',
        },
    };
}

export function soulPortalShell(t: TranslateFn): PortalShell {
    return {
        tint: 'var(--color-portal-soul)',
        icon: '✦',
        eyebrow: t('features.soul.hub.eyebrow'),
        title: t('features.soul.hub.title'),
        line: t('features.soul.hub.line'),
        fallbackCoach: {
            dot: 'var(--color-accent)',
            kind: t('features.soul.hub.fallback_coach_kind'),
            text: t('features.soul.hub.fallback_coach_text'),
            cta: t('features.soul.hub.fallback_coach_cta'),
            href: '/product/soul/stillness',
        },
    };
}
