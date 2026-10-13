'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { usePathname } from 'next/navigation';

import { useTranslations, type BrandQuote } from '@rumtelo/i18n';
import {
    AUTH_MANIFESTO_JAR_VISUALS,
    AUTH_MANIFESTO_PORTAL_VISUALS,
    AuthManifesto,
    type AuthManifestoStrip,
} from '@rumtelo/ui';

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
const JAR_KEYS = ['necessity', 'freedom', 'education', 'savings', 'play', 'give'] as const;

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
                items: JAR_KEYS.map((key, index) => ({
                    name: t(`features.brand.auth_manifesto.jars.${key}.name`),
                    short: t(`features.brand.auth_manifesto.jars.${key}.short`),
                    tone: AUTH_MANIFESTO_JAR_VISUALS[index]!.tone,
                    share: AUTH_MANIFESTO_JAR_VISUALS[index]!.share,
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
