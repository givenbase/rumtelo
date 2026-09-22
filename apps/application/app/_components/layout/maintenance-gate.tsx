'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';

import { useTranslations } from '@rumtelo/i18n';
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
    const t = useTranslations();
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
        return <BrandLoader fullScreen label={t('ui.statusPage.loading')} />;
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
                title={
                    apiDown
                        ? t('pages.shell.gates.maintenance_api_down_title')
                        : t('pages.shell.gates.maintenance_update_title')
                }
                description={
                    apiDown
                        ? t('pages.shell.gates.maintenance_api_down_body')
                        : t('pages.shell.gates.maintenance_update_body')
                }
                homeHref={webHome}
                homeLabel={t('pages.shell.gates.back_to_website')}
                reset={() => {
                    void refreshHealth();
                }}
                retryLabel={t('ui.statusPage.try_again')}
                goBackLabel={t('ui.statusPage.go_back')}
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
                        {t('pages.shell.menu.sign_out')}
                    </button>
                </div>
            ) : null}
        </div>
    );
}
