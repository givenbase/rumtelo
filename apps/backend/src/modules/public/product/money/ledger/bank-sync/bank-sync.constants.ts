/** How often the Nest cron walks every linked seat. */
export const BANK_SYNC_CRON = '0 */6 * * *';

/** Skip opportunistic / cron pull if the seat synced more recently than this. */
export const BANK_SYNC_STALE_MS = 30 * 60 * 1000;

/** Look-back window when a seat has never synced. */
export const BANK_SYNC_INITIAL_LOOKBACK_DAYS = 90;
