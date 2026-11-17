'use client';

import { useEffect, useRef } from 'react';

import { LandingCoach } from './landing-coach';
import { LandingFaq } from './landing-faq';
import { LandingFooter } from './landing-footer';
import { LandingHeader } from './landing-header';
import { LandingHero } from './landing-hero';
import { LandingHow } from './landing-how';
import { LandingJars } from './landing-jars';
import { LandingPortals } from './landing-portals';
import { LandingPricing } from './landing-pricing';
import { LandingPrinciples } from './landing-principles';
import { LandingSignupForm } from './landing-signup-form';
import { LandingWhy } from './landing-why';

/**
 * Narrative order — promise → mechanism → proof → price → the wider picture:
 *   hook (hero) → how it works (3 steps) → the six jars → how it feels daily (coach) → pricing
 *   → "grip on life" band (portals, principles, why we exist) → FAQ → sign-up.
 *
 * Background rhythm alternates plain / tinted, with Principles as the single dark pivot:
 *   hero gradient · how plain · jars tinted · coach plain · pricing tinted · portals plain
 *   · PRINCIPLES DARK · why tinted · faq plain · signup plain · footer tinted
 *
 * Cut on purpose: Problem, Loop — the hero names the problem, How it works is the loop.
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
                <LandingHow />
                <LandingJars />
                <LandingCoach />
                <LandingPricing />
                <LandingPortals />
                <LandingPrinciples />
                <LandingWhy />
                <LandingFaq />
                <LandingSignupForm />
            </main>
            <LandingFooter />
        </div>
    );
}
