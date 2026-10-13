/**
 * Who someone signs up as — chosen at the pricing table or on sign-up, carried
 * through email verify as `?as=` so it survives opening the link on another device.
 *
 * Add a direction (e.g. `company`) by extending {@link SIGN_UP_AUDIENCES} and
 * {@link signUpAudienceStartPath}, then its pricing tab + sign-up option copy.
 */

export const SIGN_UP_AUDIENCES = ['individual', 'practice'] as const;

export type SignUpAudience = (typeof SIGN_UP_AUDIENCES)[number];

export const DEFAULT_SIGN_UP_AUDIENCE: SignUpAudience = 'individual';

/** Query key on marketing sign-up / verify — `/sign-up?as=practice`. */
export const SIGN_UP_AUDIENCE_PARAM = 'as';

/** Practice name typed at sign-up — rides through verify, prefills `/practice/create?name=`. */
export const SIGN_UP_PRACTICE_NAME_PARAM = 'practiceName';

export const PRACTICE_NAME_MAX_LENGTH = 120;

/** Trimmed, single-line, capped — it only ever prefills a form the owner still confirms. */
export function parsePracticeName(input: unknown): string | null {
    if (typeof input !== 'string') return null;
    const printable = Array.from(input, char => {
        const code = char.charCodeAt(0);
        return code < 32 || code === 127 ? ' ' : char;
    }).join('');
    const value = printable.replace(/\s+/g, ' ').trim().slice(0, PRACTICE_NAME_MAX_LENGTH).trim();
    return value || null;
}

export function parseSignUpAudience(input: unknown): SignUpAudience | null {
    if (typeof input !== 'string') return null;
    const value = input.trim().toLowerCase();
    return (SIGN_UP_AUDIENCES as readonly string[]).includes(value)
        ? (value as SignUpAudience)
        : null;
}

export function signUpAudienceFromSearchParams(params: {
    get(name: string): string | null;
}): SignUpAudience {
    return parseSignUpAudience(params.get(SIGN_UP_AUDIENCE_PARAM)) ?? DEFAULT_SIGN_UP_AUDIENCE;
}

/** The default audience stays implicit so existing sign-up links are unchanged. */
export function signUpAudienceQuery(
    audience: SignUpAudience | null,
    practiceName?: string | null
): Record<string, string> {
    if (!audience || audience === DEFAULT_SIGN_UP_AUDIENCE) return {};
    const query: Record<string, string> = { [SIGN_UP_AUDIENCE_PARAM]: audience };
    const name = audience === 'practice' ? parsePracticeName(practiceName) : null;
    if (name) query[SIGN_UP_PRACTICE_NAME_PARAM] = name;
    return query;
}

/** First app path after verify — `null` = the normal household onboarding gate. */
export function signUpAudienceStartPath(
    audience: SignUpAudience | null,
    practiceName?: string | null
): string | null {
    switch (audience) {
        case 'practice': {
            const name = parsePracticeName(practiceName);
            return name ? `/practice/create?name=${encodeURIComponent(name)}` : '/practice/create';
        }
        default:
            return null;
    }
}
