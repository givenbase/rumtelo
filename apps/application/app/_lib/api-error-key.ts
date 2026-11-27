import { extractApiErrorPayload, parseApiUserMessage } from '@rumtelo/utils';

/**
 * The backend error key (`ApiErrorMessageKey`, e.g. `goal_give_needs_give_jar`) behind a failed
 * call, or null when the error carries none. For screens that answer a specific key with a
 * next move of their own instead of the shared message.
 */
export function apiErrorKeyOf(error: unknown): string | null {
    const payload = extractApiErrorPayload(error);
    if (!payload) return null;
    return (
        parseApiUserMessage(payload.message, { code: payload.code, params: payload.params })?.key ??
        null
    );
}
