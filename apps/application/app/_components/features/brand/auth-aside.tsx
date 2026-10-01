'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { useTranslations, type BrandQuote } from '@rumtelo/i18n';
import { AUTH_MANIFESTO_PORTAL_VISUALS, AuthManifesto, type AuthManifestoStrip } from '@rumtelo/ui';

/** Pexels clip (download id 17337078) — dark background. */
const AUTH_ASIDE_VIDEO =
    'https://videos.pexels.com/video-files/15179376/15179376-uhd_1920_1440_60fps.mp4';

const APP_QUOTE_KEYS = ['money_picture', 'how_it_works', 'energy', 'why'] as const;

const PORTAL_KEYS = ['money', 'growth', 'energy', 'soul'] as const;

/**
 * Desktop auth manifesto — habit quotes to pull them back into the product.
 * Respects prefers-reduced-motion (first quote stays; no video).
 */
export function AuthAside() {
    const t = useTranslations();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [reduceMotion, setReduceMotion] = useState(false);

    const quotes: BrandQuote[] = useMemo(
        () =>
            APP_QUOTE_KEYS.map(key => ({
                eyebrow: t(`features.brand.auth_quotes_app.${key}.eyebrow`),
                headline: t(`features.brand.auth_quotes_app.${key}.headline`),
                support: t(`features.brand.auth_quotes_app.${key}.support`),
            })),
        [t]
    );

    const tablistAriaLabel = t('features.brand.auth_manifesto.brand_lines_aria');

    const strip: AuthManifestoStrip = useMemo(
        () => ({
            eyebrow: t('features.brand.auth_manifesto.portals_eyebrow'),
            line: t('features.brand.auth_manifesto.portals_line'),
            items: PORTAL_KEYS.map((key, index) => ({
                name: t(`features.brand.auth_manifesto.portals.${key}.name`),
                short: t(`features.brand.auth_manifesto.portals.${key}.short`),
                tone: AUTH_MANIFESTO_PORTAL_VISUALS[index]!.tone,
                share: AUTH_MANIFESTO_PORTAL_VISUALS[index]!.share,
            })),
        }),
        [t]
    );

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

    return (
        <aside className="relative hidden h-full min-h-dvh overflow-hidden bg-fg lg:block">
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
                autoRotate={false}
                footer="portals"
                tablistAriaLabel={tablistAriaLabel}
                strip={strip}
            />
        </aside>
    );
}
