'use client';

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ComponentProps,
    type ReactNode,
} from 'react';

import { type Theme } from '@rumtelo/contracts';
import { ThemeToggle, useTheme } from '@rumtelo/ui';
import { accountThemeFromCss, cssThemeFromAccount, type CssTheme } from '@rumtelo/utils';

import { useMarketingSession } from '@/app/_components/marketing-session-provider';
import { api } from '@/lib/api';

type AccountThemeCtx = {
    accountTheme: Theme | undefined;
    setAccountTheme: (next: Theme) => Promise<void>;
};

const AccountThemeContext = createContext<AccountThemeCtx | null>(null);

/**
 * When signed in, hydrate theme from account.settings and persist toggles.
 * Signed-out visitors keep origin-local next-themes storage only.
 */
export function AccountThemeProvider({ children }: { children: ReactNode }) {
    const { isAuthenticated, user } = useMarketingSession();
    const userId = user?.id ?? null;
    const { setTheme } = useTheme();
    const hydratedForUser = useRef<string | null>(null);
    const [accountTheme, setAccountThemeState] = useState<Theme | undefined>(undefined);

    useEffect(() => {
        if (!isAuthenticated || !userId) {
            hydratedForUser.current = null;
            setAccountThemeState(undefined);
            return;
        }

        let cancelled = false;
        void (async () => {
            try {
                const settings = await api.account.settings();
                if (cancelled) return;
                setAccountThemeState(settings.theme);
                if (hydratedForUser.current === userId) return;
                hydratedForUser.current = userId;
                setTheme(cssThemeFromAccount(settings.theme));
            } catch (error) {
                console.error('account theme load failed', error);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [isAuthenticated, userId, setTheme]);

    const setAccountTheme = useCallback(
        async (next: Theme) => {
            setTheme(cssThemeFromAccount(next));
            setAccountThemeState(next);
            if (!userId) return;
            await api.account.updateSettings({ theme: next });
        },
        [setTheme, userId]
    );

    const value = useMemo(
        () => ({
            accountTheme,
            setAccountTheme,
        }),
        [accountTheme, setAccountTheme]
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

/** Theme toggle — persists to account settings when signed in. */
export function AccountThemeToggle(props: ComponentProps<typeof ThemeToggle>) {
    const { setAccountTheme } = useAccountTheme();

    return (
        <ThemeToggle
            {...props}
            onThemeChange={(next: Exclude<CssTheme, 'system'>) => {
                void setAccountTheme(accountThemeFromCss(next)).catch(error => {
                    console.error('theme save failed', error);
                });
            }}
        />
    );
}
