/**
 * Browser paths for AIS OAuth — whitelist these exact URLs in Enable Banking
 * (no locale prefix; app uses `localePrefix: 'never'`).
 */
export const BANK_SYNC_OAUTH_CALLBACK_PATH = '/banking/callback' as const;

/** Bank settings surface after a successful (or failed) OAuth return. */
export const BANK_SETTINGS_PATH = '/settings/product/money/bank' as const;
