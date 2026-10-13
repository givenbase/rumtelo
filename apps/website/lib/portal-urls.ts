import { env } from '@/lib/get-env';

/** Product app origin. */
export function appOrigin(): string {
    return env.NEXT_PUBLIC_DOMAIN_APP.replace(/\/$/, '');
}

/** Marketing site origin. */
export function webOrigin(): string {
    return env.NEXT_PUBLIC_DOMAIN_WEB.replace(/\/$/, '');
}

/** Product sign-in. */
export function appSignInUrl(query?: Record<string, string>): string {
    const url = new URL('/sign-in', `${appOrigin()}/`);
    if (query) {
        for (const [key, value] of Object.entries(query)) {
            if (value) url.searchParams.set(key, value);
        }
    }
    return url.toString();
}

/** Local marketing sign-up (same origin), optionally with remembered plan intent. */
export function webSignUpPath(query?: Record<string, string>): string {
    if (!query || Object.keys(query).length === 0) return '/sign-up';
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
        if (value) params.set(key, value);
    }
    const qs = params.toString();
    return qs ? `/sign-up?${qs}` : '/sign-up';
}

/** Post-verify / post-reset landing on the product. */
export function appSignInAfterAuthUrl(query?: Record<string, string>): string {
    return appSignInUrl({ verified: '1', ...query });
}

/** Product home / dashboard. */
export function appHomeUrl(): string {
    return `${appOrigin()}/`;
}

/** Practice desk — its overview offers “Create a Practice” when there is none yet. */
export function appPracticeUrl(): string {
    return `${appOrigin()}/practice`;
}

/** Plan & billing settings in the product app. */
export function appPlanSettingsUrl(): string {
    return `${appOrigin()}/settings/general/plan`;
}

export function portalDomains() {
    return {
        app: env.NEXT_PUBLIC_DOMAIN_APP,
        web: env.NEXT_PUBLIC_DOMAIN_WEB,
        back: env.NEXT_PUBLIC_DOMAIN_BACK,
    };
}
