export type StatusType =
    | 'access-denied'
    | 'error'
    | 'maintenance'
    | 'not-found'
    | 'offline'
    | 'unauthorized';

export interface StatusPageProps {
    /** Shown in development when type is `error`. */
    errorDetails?: string;
    /** Primary home / escape link. Defaults to `/`. */
    homeHref?: string;
    /** Label for the home link. */
    homeLabel?: string;
    /** Label for the retry button when `reset` is set. Defaults to English fallback. */
    retryLabel?: string;
    /** Label for the history-back button. Defaults to English fallback. */
    goBackLabel?: string;
    /** Retry handler — typically `router.refresh()` + error-boundary `reset()` in `startTransition`. */
    reset?: () => void;
    /** Override auto status code. Pass `0` / falsy to hide. */
    statusCode?: number | string | null;
    type: StatusType;
    /** Optional copy overrides. */
    title?: string;
    description?: string;
}
