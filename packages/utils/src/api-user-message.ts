import { isApiErrorMessageKey, type ApiErrorMessageKey } from '@rumtelo/contracts';

type TranslateFn = (key: string, values?: Record<string, string | number | Date>) => string;

export type ApiErrorParams = Record<string, string | number>;

/**
 * Better Auth `error.code` → i18n leaf.
 * Prefer this over English message matching.
 * @see @better-auth/core BASE_ERROR_CODES
 */
const BETTER_AUTH_CODE_TO_KEY: Record<string, ApiErrorMessageKey> = {
    USER_NOT_FOUND: 'user_not_found',
    INVALID_EMAIL_OR_PASSWORD: 'invalid_email_or_password',
    EMAIL_NOT_VERIFIED: 'email_not_verified',
    EMAIL_VERIFICATION_REQUIRED: 'email_not_verified',
    PASSWORD_TOO_SHORT: 'password_too_short',
    USER_ALREADY_EXISTS: 'user_already_exists',
    USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'user_already_exists_use_another_email',
    INVALID_TOKEN: 'invalid_token',
    TOKEN_EXPIRED: 'token_expired',
    TOO_MANY_REQUESTS: 'too_many_requests',
};

/** English text from Better Auth codes — last-resort fallback when `code` is missing. */
const BETTER_AUTH_ENGLISH_TO_KEY: Record<string, ApiErrorMessageKey> = {
    'Invalid email or password': 'invalid_email_or_password',
    'User not found': 'user_not_found',
    'Email not verified': 'email_not_verified',
    'Too many requests. Please try again later.': 'too_many_requests',
    'Password too short': 'password_too_short',
    'User already exists.': 'user_already_exists',
    'User already exists. Use another email.': 'user_already_exists_use_another_email',
    'Invalid token': 'invalid_token',
    'Token expired': 'token_expired',
};

const IBAN_KEYS = new Set<string>(['invalid_iban', 'iban_already_linked']);

export function isIbanApiErrorMessage(raw: string): boolean {
    return IBAN_KEYS.has(raw.trim());
}

export type ParsedApiUserError = {
    key: ApiErrorMessageKey;
    params?: ApiErrorParams;
};

export type ParseApiUserMessageOptions = {
    /** Better Auth / oRPC error code when present. */
    code?: string | null;
    params?: ApiErrorParams;
};

/** Resolve wire message / Better Auth code to an i18n leaf. */
export function parseApiUserMessage(
    raw: string,
    options?: ParseApiUserMessageOptions | ApiErrorParams
): ParsedApiUserError | null {
    const opts: ParseApiUserMessageOptions =
        options && ('code' in options || 'params' in options) && !isPlainParams(options)
            ? options
            : { params: options as ApiErrorParams | undefined };

    const params = opts.params;
    const code = opts.code?.trim();
    if (code) {
        const fromCode =
            BETTER_AUTH_CODE_TO_KEY[code] ?? BETTER_AUTH_CODE_TO_KEY[code.toUpperCase()];
        if (fromCode) return params ? { key: fromCode, params } : { key: fromCode };
    }

    const trimmed = raw.trim();
    if (!trimmed) return null;

    if (isApiErrorMessageKey(trimmed)) {
        return params ? { key: trimmed, params } : { key: trimmed };
    }

    const fromEnglish = BETTER_AUTH_ENGLISH_TO_KEY[trimmed];
    if (fromEnglish) return params ? { key: fromEnglish, params } : { key: fromEnglish };

    return null;
}

function isPlainParams(value: object): value is ApiErrorParams {
    return !('code' in value) && !('params' in value);
}

/** Map a known API message (key, Better Auth code, or BA English) to localized copy. */
export function resolveApiUserMessage(
    raw: string,
    translate: TranslateFn,
    options?: ParseApiUserMessageOptions | ApiErrorParams
): string {
    const parsed = parseApiUserMessage(raw, options);
    if (!parsed) return raw.trim() || raw;
    return parsed.params ? translate(parsed.key, parsed.params) : translate(parsed.key);
}

/** Pull message, code, and params from Nest/oRPC/Better Auth-shaped errors. */
export function extractApiErrorPayload(error: unknown): {
    message: string;
    code?: string;
    params?: ApiErrorParams;
} | null {
    if (!error || typeof error !== 'object') {
        if (typeof error === 'string' && error.trim()) return { message: error.trim() };
        return null;
    }

    const candidates: object[] = [];
    const seen = new Set<object>();
    let current: unknown = error;
    let depth = 0;

    while (current && typeof current === 'object' && depth < 6 && !seen.has(current)) {
        seen.add(current);
        candidates.push(current);
        const row = current as {
            cause?: unknown;
            data?: unknown;
            error?: unknown;
            response?: { data?: unknown };
        };
        current = row.data ?? row.cause ?? row.error ?? row.response?.data;
        depth += 1;
    }

    let code: string | undefined;
    for (const candidate of candidates) {
        const row = candidate as { code?: unknown };
        if (typeof row.code === 'string' && row.code.trim()) {
            code = row.code.trim();
            break;
        }
        if (typeof row.code === 'number') {
            code = String(row.code);
            break;
        }
    }

    for (const candidate of candidates) {
        const row = candidate as {
            message?: unknown;
            data?: { message?: unknown; params?: unknown };
            params?: unknown;
        };

        const paramsRaw = row.data?.params ?? row.params;
        const params =
            paramsRaw && typeof paramsRaw === 'object' && !Array.isArray(paramsRaw)
                ? (paramsRaw as ApiErrorParams)
                : undefined;

        const dataMessage = row.data?.message;
        if (typeof dataMessage === 'string' && dataMessage.trim()) {
            return { message: dataMessage.trim(), code, params };
        }

        if (typeof row.message === 'string' && row.message.trim()) {
            return { message: row.message.trim(), code, params };
        }
    }

    if (error instanceof Error && error.message.trim()) {
        return { message: error.message.trim(), code };
    }

    if (code) return { message: '', code };

    return null;
}
