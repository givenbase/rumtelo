'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ComponentProps } from 'react';

/** Matches CSS `[data-theme]` + existing localStorage key. */
export const THEME_STORAGE_KEY = 'rumtelo-theme';

type ThemeProviderProps = ComponentProps<typeof NextThemesProvider>;

/**
 * App-wide theme — `next-themes` owns storage, flash prevention, and system mode.
 * Defaults to light; System follows the device; Dark is an explicit choice.
 * CSS tokens key off `[data-theme='light'|'dark']`.
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
    return (
        <NextThemesProvider
            attribute="data-theme"
            defaultTheme="light"
            enableSystem
            storageKey={THEME_STORAGE_KEY}
            disableTransitionOnChange
            {...props}>
            {children}
        </NextThemesProvider>
    );
}
