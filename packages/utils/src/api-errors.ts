/**
 * oRPC / Zod client-error helpers for form UIs.
 * Canonical payload: `{ data: { issues: [{ path, message }] } }`.
 */

export type OrpcValidationIssue = {
    message: string;
    /** Dot path for RHF / FormErrorBox. Empty = root. */
    path: string;
};

function joinIssuePath(path: unknown): string {
    if (Array.isArray(path)) {
        return path
            .filter(segment => segment !== null && segment !== undefined && segment !== '')
            .join('.');
    }
    return typeof path === 'string' ? path : '';
}

/**
 * Extract oRPC / Zod validation issues from a client error.
 * Also maps CONFLICT `{ data: { field, message } }` onto a field path.
 */
export function getOrpcValidationIssues(error: unknown): OrpcValidationIssue[] {
    if (!error || typeof error !== 'object') return [];

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

    for (const candidate of candidates) {
        const row = candidate as {
            data?: { field?: unknown; issues?: unknown; message?: unknown };
            issues?: unknown;
        };

        const rawIssues = row.data?.issues ?? row.issues;
        if (Array.isArray(rawIssues) && rawIssues.length > 0) {
            return rawIssues
                .map((issue): OrpcValidationIssue | null => {
                    if (!issue || typeof issue !== 'object') return null;
                    const issueRow = issue as { message?: unknown; path?: unknown };
                    return {
                        path: joinIssuePath(issueRow.path),
                        message:
                            typeof issueRow.message === 'string' && issueRow.message.trim()
                                ? issueRow.message
                                : 'Invalid value',
                    };
                })
                .filter((issue): issue is OrpcValidationIssue => issue !== null);
        }
    }

    for (const candidate of candidates) {
        const row = candidate as {
            code?: unknown;
            data?: { field?: unknown; message?: unknown };
            field?: unknown;
            message?: unknown;
        };
        const payload =
            row.data && typeof row.data === 'object'
                ? row.data
                : ({ field: row.field, message: row.message } as {
                      field?: unknown;
                      message?: unknown;
                  });
        const field =
            typeof payload.field === 'string' && payload.field.trim() ? payload.field.trim() : '';
        const message =
            (typeof payload.message === 'string' && payload.message.trim()
                ? payload.message.trim()
                : undefined) ||
            (typeof row.message === 'string' && row.message.trim()
                ? row.message.trim()
                : undefined);

        const code = typeof row.code === 'string' ? row.code.toUpperCase() : '';
        if (field && message && (code === 'CONFLICT' || !code || Boolean(payload.field))) {
            return [{ path: field, message }];
        }
    }

    return [];
}

export type ExtractErrorMessageFallbacks = {
    invalidValue?: string;
    unexpected?: string;
    generic?: string;
};

const DEFAULT_ERROR_MESSAGES: Required<ExtractErrorMessageFallbacks> = {
    invalidValue: 'Invalid value',
    unexpected: 'An unexpected error occurred. Please try again.',
    generic: 'An error occurred. Please try again.',
};

/** User-facing message from string / Error / oRPC-shaped payloads. */
export function extractErrorMessage(
    error: unknown,
    messages: ExtractErrorMessageFallbacks = {}
): string {
    const fallback = { ...DEFAULT_ERROR_MESSAGES, ...messages };
    if (!error) return fallback.unexpected;

    if (typeof error === 'string' && error.trim()) return error.trim();

    if (error instanceof Error) {
        const withData = error as Error & { data?: unknown };
        if (withData.data && typeof withData.data === 'object' && withData.data !== null) {
            const dataMessage = (withData.data as { message?: unknown }).message;
            if (typeof dataMessage === 'string' && dataMessage.trim()) return dataMessage.trim();
        }

        const issues = getOrpcValidationIssues(error);
        if (issues.length > 0) {
            return issues
                .map(issue => (issue.path ? `${issue.path}: ${issue.message}` : issue.message))
                .join('; ');
        }

        return error.message || fallback.generic;
    }

    if (typeof error === 'object' && error !== null) {
        const issues = getOrpcValidationIssues(error);
        if (issues.length > 0) {
            return issues
                .map(issue => (issue.path ? `${issue.path}: ${issue.message}` : issue.message))
                .join('; ');
        }

        const row = error as { message?: unknown; error?: unknown };
        if (typeof row.message === 'string' && row.message.trim()) return row.message.trim();
        if (typeof row.error === 'string' && row.error.trim()) return row.error.trim();
    }

    return fallback.unexpected;
}
