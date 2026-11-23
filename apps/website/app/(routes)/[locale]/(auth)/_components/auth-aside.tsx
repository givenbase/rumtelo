'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { usePathname } from 'next/navigation';

import { DEFAULT_GROUP_SPLIT, JAR_GROUP_ORDER, JarGroup } from '@rumtelo/contracts';
import { useTranslations, type BrandQuote } from '@rumtelo/i18n';
import { AUTH_MANIFESTO_PORTAL_VISUALS, AuthManifesto, type AuthManifestoStrip } from '@rumtelo/ui';

import { isLaunchProductsDeferred, isProductLive } from '@/lib/launch-products';

/** Pexels clip (download id 27908405). */
const AUTH_ASIDE_VIDEO =
    'https://videos.pexels.com/video-files/27908405/12260011_1920_1080_60fps.mp4';

const WEB_QUOTE_KEYS = ['money_picture', 'how_it_works', 'who_its_for', 'life_beyond'] as const;

const PORTAL_KEYS = ['money', 'growth', 'energy', 'soul'] as const;
/** Live portals keep their visual tone; the bar splits evenly across what ships today. */
const LIVE_PORTAL_ITEMS = PORTAL_KEYS.map((key, index) => ({
    key,
    tone: AUTH_MANIFESTO_PORTAL_VISUALS[index]!.tone,
})).filter(item => isProductLive(item.key));
/** One segment per group — the tone of its main pot; a new household starts with these three. */
const GROUP_TONE: Record<JarGroup, string> = {
    [JarGroup.BASIS]: 'bg-jar-nec',
    [JarGroup.FUTURE]: 'bg-jar-lts',
    [JarGroup.FREE]: 'bg-jar-play',
};

/**
 * Desktop auth manifesto — marketing quotes; jars on sign-up, portals elsewhere.
 * Respects prefers-reduced-motion (first quote stays; no video).
 */
export function AuthAside() {
    const t = useTranslations();
    const pathname = usePathname();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [reduceMotion, setReduceMotion] = useState(false);
    const isSignUp = pathname.includes('/sign-up');
    const footer = isSignUp ? 'jars' : 'portals';
    /** docs/brand/quotes.md — sign-up leads with how-it-works. */
    const initialIndex = isSignUp ? 1 : 0;

    const quotes: BrandQuote[] = useMemo(
        () =>
            WEB_QUOTE_KEYS.map(key => ({
                eyebrow: t(`features.brand.auth_quotes_web.${key}.eyebrow`),
                headline: t(`features.brand.auth_quotes_web.${key}.headline`),
                support: t(`features.brand.auth_quotes_web.${key}.support`),
            })),
        [t]
    );

    const tablistAriaLabel = t('features.brand.auth_manifesto.brand_lines_aria');

    const strip: AuthManifestoStrip = useMemo(() => {
        if (footer === 'jars') {
            return {
                eyebrow: t('features.brand.auth_manifesto.jars_eyebrow'),
                line: t('features.brand.auth_manifesto.jars_line'),
                // The strip uppercases `short`, so the group title serves as both labels.
                items: JAR_GROUP_ORDER.map(group => ({
                    name: t(`features.money.groups.${group}.title`),
                    short: t(`features.money.groups.${group}.title`),
                    tone: GROUP_TONE[group],
                    share: DEFAULT_GROUP_SPLIT[group],
                })),
            };
        }

        return {
            eyebrow: t('features.brand.auth_manifesto.portals_eyebrow'),
            line: t(
                isLaunchProductsDeferred()
                    ? 'features.brand.auth_manifesto.portals_line_core'
                    : 'features.brand.auth_manifesto.portals_line'
            ),
            items: LIVE_PORTAL_ITEMS.map(({ key, tone }) => ({
                name: t(`features.brand.auth_manifesto.portals.${key}.name`),
                short: t(`features.brand.auth_manifesto.portals.${key}.short`),
                tone,
                share: 100 / LIVE_PORTAL_ITEMS.length,
            })),
        };
    }, [footer, t]);

    useEffect(() => {
        const media = window.matchMedia('(prefers-reduced-motion: reduce)');
        const sync = () => setReduceMotion(media.matches);
        sync();
        media.addEventListener('change', sync);
        return () => media.removeEventListener('change', sync);
    }, []);

    useEffect(() => {
        const video = videoRef.current;
        if (!video || reduceMotion) return;
        void video.play().catch(() => {
            // Autoplay can fail without user gesture; manifesto copy remains.
        });
    }, [reduceMotion]);

    // Sticky on desktop — the form column scrolls, the manifesto stays in view.
    return (
        <aside className="relative hidden h-full min-h-dvh overflow-hidden bg-fg lg:sticky lg:top-0 lg:block lg:h-dvh lg:self-start">
            {!reduceMotion ? (
                <video
                    ref={videoRef}
                    aria-hidden
                    className="absolute inset-0 size-full object-cover"
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata">
                    <source src={AUTH_ASIDE_VIDEO} type="video/mp4" />
                </video>
            ) : null}

            <AuthManifesto
                quotes={quotes}
                reduceMotion={reduceMotion}
                footer={footer}
                initialIndex={initialIndex}
                tablistAriaLabel={tablistAriaLabel}
                strip={strip}
            />
        </aside>
    );
}
