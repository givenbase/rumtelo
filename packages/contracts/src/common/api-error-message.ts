/**
 * User-facing API error keys — leaf names under `common.message.error.api` in @rumtelo/i18n.
 * Backend throws these (not English prose). Client translates via next-intl.
 */
export const API_ERROR_MESSAGES = [
    'goal_save_only_jar_focus',
    'goal_save_needs_jar_focus',
    'goal_only_active_focus',
    'goal_save_only_achieved',
    'goal_not_active',
    'goal_no_jar_spend',
    'payment_amount_positive',
    'bill_paused_no_settlement',
    'bill_link_outflow',
    'bill_link_inflow',
    'iban_already_linked',
    'account_name_taken',
    'bank_not_found',
    'bank_required',
    'settlement_account_invalid',
    'invalid_iban',
    'bank_sync_disabled',
    'bank_sync_failed',
    'bank_sync_account_required',
    'plan_downgrade_max_only',
    'demo_no_plan_change',
    'invitation_create_failed',
    'jar_split_total',
    'book_catalog_unavailable',
    'contact_send_failed',
    'contact_message_rejected',
    'not_authenticated',
    'no_household_selected',
    'not_household_member',
    'plan_missing_capability',
    'plan_limit_reached',
    'capability_unavailable',
    'household_not_found',
    'household_create_failed',
    'household_context_required',
    'auth_not_ready',
    'time_entry_not_found',
    'account_settings_not_found',
    // Better Auth / rate limit — prefer mapping by `code`, English is fallback only
    'invalid_email_or_password',
    'user_not_found',
    'email_not_verified',
    'too_many_requests',
    'password_too_short',
    'user_already_exists',
    'user_already_exists_use_another_email',
    'invalid_token',
    'token_expired',
] as const;

export type ApiErrorMessageKey = (typeof API_ERROR_MESSAGES)[number];

const API_ERROR_KEY_SET = new Set<string>(API_ERROR_MESSAGES);

export function isApiErrorMessageKey(value: string): value is ApiErrorMessageKey {
    return API_ERROR_KEY_SET.has(value);
}
