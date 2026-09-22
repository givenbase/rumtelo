/**
 * Canonical map: landing section → build status.
 *
 * The original `design/Kluis Landing.dc.html` was a money-only landing. The current
 * page follows a what → how → trust → price arc:
 * hero → portals → jars → the Coach → principles → why we exist → pricing → FAQ → sign-up.
 * Copy lives in `@rumtelo/i18n` (`pages.landing.*`); structure in `lib/landing-content.ts`.
 *
 * Cut on purpose to keep the page light: Problem (hero already names it), Loop (covered by
 * jars + Coach + principles), Proof (Why already carries the founders).
 */

export type LandingSectionStatus = 'shell' | 'partial' | 'missing';

export interface LandingSection {
    id: string;
    anchor: string;
    label: string;
    status: LandingSectionStatus;
    gap: string;
}

export const LANDING_SECTIONS: LandingSection[] = [
    {
        id: 'header',
        anchor: 'header',
        label: 'Sticky nav + theme + sign-in + CTA',
        status: 'shell',
        gap: 'Anchor nav only; product CTAs go to DOMAIN_APP',
    },
    {
        id: 'hero',
        anchor: 'hero',
        label: 'Hero — money punch + live split demo + coach line',
        status: 'shell',
        gap: 'Demo loop uses static income; real data via API later',
    },
    {
        id: 'portals',
        anchor: '#portals',
        label: 'Four portals + switch strip',
        status: 'shell',
        gap: 'Feature lines mirror FEATURES in @rumtelo/contracts by hand',
    },
    {
        id: 'jars',
        anchor: '#jars',
        label: 'Six jars + split bar (tinted band)',
        status: 'shell',
        gap: 'Static copy',
    },
    {
        id: 'coach',
        anchor: '#coach',
        label: 'The Coach — rendered mock feed',
        status: 'shell',
        gap: 'Mock messages; could read from the coach catalog later',
    },
    {
        id: 'principles',
        anchor: '#principles',
        label: 'Four principles (NL + EN) — dark pivot band',
        status: 'shell',
        gap: 'Static copy from docs/product/principles.md',
    },
    {
        id: 'why',
        anchor: '#why',
        label: 'Why Rumtelo exists + books (tinted band)',
        status: 'shell',
        gap: 'Founder note + book lineage; legal disclaimer on independence',
    },
    {
        id: 'pricing',
        anchor: '#pricing',
        label: 'Pricing toggle + 3 plans',
        status: 'partial',
        gap: 'Logged-in: avatar + Open app; pricing shows current / upgrade / switch → app plan settings',
    },
    {
        id: 'faq',
        anchor: '#faq',
        label: 'FAQ (native <details>, tinted band)',
        status: 'shell',
        gap: 'Static copy',
    },
    {
        id: 'signup',
        anchor: '#signup',
        label: 'Create account hand-off form',
        status: 'partial',
        gap: 'Draft → /sign-up (Better Auth); terms/privacy linked',
    },
    {
        id: 'footer',
        anchor: 'footer',
        label: 'Trust cards + links (tinted)',
        status: 'shell',
        gap: 'Legal routes live at /privacy /terms /data-processing',
    },
];
