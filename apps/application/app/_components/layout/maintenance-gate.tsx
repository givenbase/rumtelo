'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';

import { BrandLoader, StatusPage } from '@rumtelo/ui';

import { signOut } from '@/app/_lib/auth';
import {
    canBypassMaintenance,
    isMaintenanceFlagEnabled,
    isMaintenanceSurfaceActive,
    probeApiReady,
} from '@/app/_lib/maintenance';
import { env } from '@/app/_utils/get-env';
import { useAuth } from '@/components/features/shell/auth-provider';

const POLL_MS = 20_000;

/**
 * Locks the product shell during scheduled maintenance or when Nest is down.
 * `@rumtelo.com` staff may enter while the API is healthy and the flag is on.
 */
export function MaintenanceGate({ children }: { children: ReactNode }) {
    const { user, isPending, isAuthenticated } = useAuth();
    const flagOn = isMaintenanceFlagEnabled();
    const [apiReady, setApiReady] = useState<boolean | null>(null);

    const refreshHealth = useCallback(async () => {
        const ready = await probeApiReady();
        setApiReady(ready);
        return ready;
    }, []);

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            const ready = await probeApiReady();
            if (!cancelled) setApiReady(ready);
        })();
        const timer = window.setInterval(() => {
            void probeApiReady().then(ready => {
                if (!cancelled) setApiReady(ready);
            });
        }, POLL_MS);
        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    }, []);

    if (apiReady === null || isPending) {
        return <BrandLoader fullScreen label="Loading" />;
    }

    const surfaceActive = isMaintenanceSurfaceActive({ flagOn, apiReady });
    if (!surfaceActive || canBypassMaintenance(user?.email, { flagOn, apiReady })) {
        return children;
    }

    const webHome = env.NEXT_PUBLIC_DOMAIN_WEB.replace(/\/$/, '');
    const apiDown = !apiReady;

    return (
        <div className="relative min-h-dvh">
            <StatusPage
                type="maintenance"
                title={apiDown ? 'Rumtelo is briefly offline' : 'Rumtelo is getting ready'}
                description={
                    apiDown
                        ? 'We cannot reach the API right now. Your jars and data are safe — try again in a moment.'
                        : 'We are finishing a short update. Only the Rumtelo team can sign in for now.'
                }
                homeHref={webHome}
                homeLabel="Back to website"
                reset={() => {
                    void refreshHealth();
                }}
            />
            {isAuthenticated ? (
                <div className="pointer-events-none fixed inset-x-0 bottom-8 z-10 flex justify-center px-4">
                    <button
                        type="button"
                        className="pointer-events-auto rounded-full border border-line bg-surface px-4 py-2 text-xs font-semibold text-fg-muted shadow-md transition hover:border-accent hover:text-accent"
                        onClick={() => {
                            void (async () => {
                                await signOut();
                                window.location.href = `${webHome}/`;
                            })();
                        }}>
                        Sign out
                    </button>
                </div>
            ) : null}
        </div>
    );
}
