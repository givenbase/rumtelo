/**
 * English strings for Playwright role/name selectors when testid or URL is impractical.
 * E2E runs with locale `en-US` only — see playwright.config.ts `use.locale`.
 */
export const E2E_EN = {
    aria: {
        mainNav: 'Main navigation',
        lockedPlanGate: 'Plan upgrade required',
    },
    auth: {
        signInSubmit: 'Sign in',
    },
} as const;
