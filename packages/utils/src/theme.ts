import { Theme } from '@rumtelo/contracts';

/** Values accepted by `next-themes` `setTheme`. */
export type CssTheme = 'light' | 'dark' | 'system';

export function cssThemeFromAccount(theme: Theme): CssTheme {
    if (theme === Theme.DARK) return 'dark';
    if (theme === Theme.SYSTEM) return 'system';
    return 'light';
}

export function accountThemeFromCss(theme: CssTheme): Theme {
    if (theme === 'dark') return Theme.DARK;
    if (theme === 'system') return Theme.SYSTEM;
    return Theme.LIGHT;
}
