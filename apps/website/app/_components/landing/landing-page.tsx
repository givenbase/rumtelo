'use client';

import { useEffect, useRef } from 'react';

import { LandingCoach } from './landing-coach';
import { LandingFaq } from './landing-faq';
import { LandingFooter } from './landing-footer';
import { LandingHeader } from './landing-header';
import { LandingHero } from './landing-hero';
import { LandingJars } from './landing-jars';
import { LandingPortals } from './landing-portals';
import { LandingPricing } from './landing-pricing';
import { LandingPrinciples } from './landing-principles';
import { LandingSignupForm } from './landing-signup-form';
import { LandingWhy } from './landing-why';

/**
 * Narrative order — what → how → trust → price:
 *   hook (hero) → what it is (portals) → the core mechanic (jars) → how it feels daily (coach)
 *   → the rules we keep (principles, dark band) → why we exist (trust) → pricing → FAQ → sign-up.
 *
 * Background rhythm alternates plain / tinted, with Principles as the single dark pivot:
 *   hero gradient · portals plain · jars tinted · coach plain · PRINCIPLES DARK
 *   · why tinted · pricing plain · faq tinted · signup plain · footer tinted
 *
 * Cut on purpose (hero already decodes the slogan; Why carries the founders):
 *   Problem, Loop — proof strip stays light (no product list in the hero).
 */
export function LandingPage() {
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const root = rootRef.current;
        if (!root) return;

        const sections = Array.from(root.querySelectorAll<HTMLElement>('section'));
        sections.forEach((sec, i) => {
            if (i === 0) return;
            if (sec.getBoundingClientRect().top < window.innerHeight) return;
            sec.setAttribute('data-reveal', '');
        });

        let pending = false;
        const check = () => {
            pending = false;
            root.querySelectorAll<HTMLElement>('section[data-reveal=""]').forEach(sec => {
                if (sec.getBoundingClientRect().top < window.innerHeight * 0.88) {
                    sec.setAttribute('data-reveal', 'in');
                }
            });
        };
        const onScroll = () => {
            if (pending) return;
            pending = true;
            requestAnimationFrame(check);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll, { passive: true });
        check();
        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
        };
    }, []);

    return (
        <div ref={rootRef} className="min-h-screen overflow-x-clip">
            <LandingHeader />
            <main>
                <LandingHero />
                <LandingPortals />
                <LandingJars />
                <LandingCoach />
                <LandingPrinciples />
                <LandingWhy />
                <LandingPricing />
                <LandingFaq />
                <LandingSignupForm />
            </main>
            <LandingFooter />
        </div>
    );
}
