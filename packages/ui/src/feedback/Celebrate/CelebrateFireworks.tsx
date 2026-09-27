'use client';

import { useEffect } from 'react';

import { fireFireworks } from './celebrate';
import type { FireworksOptions } from './types';

type CelebrateFireworksProps = FireworksOptions & {
    /** When true, runs a fireworks burst. */
    active: boolean;
};

/**
 * Declarative fireworks — reusable (onboarding finish, goals, …).
 * Imperative: `celebrateFireworks` / `fireFireworks` from `@rumtelo/ui`.
 */
export function CelebrateFireworks({
    active,
    durationMs = 1800,
    zIndex,
    colors,
}: CelebrateFireworksProps) {
    useEffect(() => {
        if (!active) return;
        return fireFireworks({ durationMs, zIndex, colors });
    }, [active, durationMs, zIndex, colors]);

    return null;
}
