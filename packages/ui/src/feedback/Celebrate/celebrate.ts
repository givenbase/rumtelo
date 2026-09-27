import confetti, { type Options } from 'canvas-confetti';

import type { FireworksOptions } from './types';

/** Accent + jar tones from `@rumtelo/config` theme (light). */
export const CELEBRATE_COLORS = [
    '#06656c', // accent / FF
    '#64748b', // nec
    '#0369a1', // lts
    '#0e7490', // edu
    '#b45309', // play
    '#15803d', // give
] as const;

export function prefersReducedMotion(): boolean {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min;
}

/**
 * Side fireworks (left + right) — classic canvas-confetti fireworks look.
 * Returns a cancel function. No-ops when reduced motion is preferred.
 */
export function fireFireworks(options: FireworksOptions = {}): () => void {
    if (typeof window === 'undefined' || prefersReducedMotion()) {
        return () => undefined;
    }

    const durationMs = options.durationMs ?? 1800;
    const colors = options.colors ?? [...CELEBRATE_COLORS];
    const zIndex = options.zIndex ?? 80;
    const animationEnd = Date.now() + durationMs;

    const defaults: Options = {
        startVelocity: 28,
        spread: 360,
        ticks: 70,
        zIndex,
        colors,
        disableForReducedMotion: true,
    };

    const interval = window.setInterval(() => {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) {
            window.clearInterval(interval);
            return;
        }

        const particleCount = Math.max(12, Math.round(48 * (timeLeft / durationMs)));

        void confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.08, 0.28), y: Math.random() - 0.15 },
        });
        void confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.72, 0.92), y: Math.random() - 0.15 },
        });
    }, 280);

    return () => {
        window.clearInterval(interval);
        confetti.reset();
    };
}

/** Fireworks that resolve when the burst window ends (or immediately if reduced motion). */
export function celebrateFireworks(options: FireworksOptions = {}): Promise<void> {
    const durationMs = options.durationMs ?? 1800;
    if (prefersReducedMotion()) return Promise.resolve();

    return new Promise(resolve => {
        const cancel = fireFireworks(options);
        window.setTimeout(() => {
            cancel();
            resolve();
        }, durationMs + 200);
    });
}
