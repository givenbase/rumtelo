'use client';

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    type ComponentProps,
    type ReactNode,
} from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { type Theme } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';
import { ThemeToggle, useTheme } from '@rumtelo/ui';

import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';
import { accountThemeFromCss, cssThemeFromAccount, type CssTheme } from '@rumtelo/utils';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';

type AccountThemeCtx = {
    /** Server preference when signed in; undefined while loading or signed out. */
    accountTheme: Theme | undefined;
    /** Apply locally and persist to account settings when signed in. */
    setAccountTheme: (next: Theme) => Promise<void>;
};

const AccountThemeContext = createContext<AccountThemeCtx | null>(null);

/**
 * Hydrates `next-themes` from `account.settings.theme` once per signed-in user,
 * and exposes a setter that keeps localStorage + account settings in sync.
 */
export function AccountThemeProvider({ children }: { children: ReactNode }) {
    const { userId } = useAuth();
    const { setTheme } = useTheme();
    const queryClient = useQueryClient();
    const hydratedForUser = useRef<string | null>(null);

    const settingsQuery = useQuery({
        ...apiQuery.account.settings.queryOptions(),
        enabled: Boolean(userId),
    });
    const serverTheme = settingsQuery.data?.theme;

    useEffect(() => {
        if (!userId) {
            hydratedForUser.current = null;
            return;
        }
        if (serverTheme === undefined) return;
        if (hydratedForUser.current === userId) return;
        hydratedForUser.current = userId;
        setTheme(cssThemeFromAccount(serverTheme));
    }, [userId, serverTheme, setTheme]);

    const setAccountTheme = useCallback(
        async (next: Theme) => {
            setTheme(cssThemeFromAccount(next));
            if (!userId) return;
            const updated = await api.account.updateSettings({ theme: next });
            queryClient.setQueryData(apiQuery.account.settings.key(), updated);
        },
        [queryClient, setTheme, userId]
    );

    const value = useMemo(
        () => ({
            accountTheme: serverTheme,
            setAccountTheme,
        }),
        [serverTheme, setAccountTheme]
    );

    return <AccountThemeContext.Provider value={value}>{children}</AccountThemeContext.Provider>;
}

export function useAccountTheme(): AccountThemeCtx {
    const ctx = useContext(AccountThemeContext);
    if (!ctx) {
        throw new Error('useAccountTheme must be used within AccountThemeProvider');
    }
    return ctx;
}

/** Shell toggle — flips light/dark and saves the explicit preference to the account. */
export function AccountThemeToggle(props: ComponentProps<typeof ThemeToggle>) {
    const { setAccountTheme } = useAccountTheme();
    const { showToast } = useAppShell();
    const tToast = useTranslations('pages.settings.toasts');
    const tTheme = useTranslations('ui.theme');
    const { resolvedTheme } = useTheme();
    const themeAriaLabel =
        resolvedTheme === 'dark' ? tTheme('switch_to_light') : tTheme('switch_to_dark');

    return (
        <ThemeToggle
            {...props}
            aria-label={props['aria-label'] ?? themeAriaLabel}
            onThemeChange={(next: Exclude<CssTheme, 'system'>) => {
                void setAccountTheme(accountThemeFromCss(next)).catch(error => {
                    console.error('theme save failed', error);
                    showToast(tToast('theme_failed'), 'error');
                });
            }}
        />
    );
}
