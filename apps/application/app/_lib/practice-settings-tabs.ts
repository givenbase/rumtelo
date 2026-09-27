/**
 * Practice settings IA — tabs under `/practice/settings/{billing|company}`.
 * Mirrors household SettingsShell grouping for consistency.
 */

import { practicePath } from './routes';

export type PracticeSettingsTab = 'billing' | 'company';

export const PRACTICE_SETTINGS_DEFAULT_TAB: PracticeSettingsTab = 'billing';

export type PracticeSettingsNavItem = {
    key: PracticeSettingsTab;
    labelKey: string;
    subKey: string;
};

export const PRACTICE_SETTINGS_TABS: PracticeSettingsNavItem[] = [
    {
        key: 'billing',
        labelKey: 'pages.practice.settings.tabs.billing.label',
        subKey: 'pages.practice.settings.tabs.billing.sub',
    },
    {
        key: 'company',
        labelKey: 'pages.practice.settings.tabs.company.label',
        subKey: 'pages.practice.settings.tabs.company.sub',
    },
];

export function practiceSettingsHref(tab: PracticeSettingsTab): string {
    return practicePath('settings', tab);
}

export function practiceSettingsTabFromPathname(pathname: string): PracticeSettingsTab {
    const path = pathname.replace(/^\/(en|nl|es|fr)(?=\/|$)/, '') || '/';
    if (path.includes('/settings/company')) return 'company';
    if (path.includes('/settings/billing')) return 'billing';
    return PRACTICE_SETTINGS_DEFAULT_TAB;
}
