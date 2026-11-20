/**
 * The Coach line — pure rules (what may render, in which order, from which feed rows).
 * UI: `components/features/helpers/coach-line.tsx`. Design: `docs/product/coach-redesign.md` §2–§4.
 */
import type { CoachMessage } from '@rumtelo/contracts';

export type CoachLineCta = { label: string; href: string };

export type CoachLineDismiss =
    /** Feed tips hide for the whole household on the server (`coach.dismiss`). */
    | { kind: 'feed'; messageId: string }
    /** Local rules hide per device until `fingerprint` changes (new band, new month). */
    | { kind: 'local'; fingerprint: string };

export type CoachLineCandidate = {
    /** Stable rule or feed id, e.g. `feed:<messageId>` or `jars.necessities_over`. */
    id: string;
    /** One sentence, already translated. */
    text: string;
    /** The primary move. A candidate without one is never shown (every tip carries a move). */
    cta: CoachLineCta;
    /** Optional second, equally positive move (fixed costs over the Necessities split). */
    secondaryCta?: CoachLineCta | null;
    dismiss: CoachLineDismiss;
};

/** Fingerprint per local candidate id, as stored on this device. */
export type CoachLineLocalHidden = Readonly<Record<string, string>>;

type LaunchPortal = 'energy' | 'soul';

const DEFERRED_PORTAL_HREF = /^\/product\/(energy|soul)(?:[/?#]|$)/;

/** CTA into a portal that is not live in this environment (Energy / Soul in production). */
export function isDeferredPortalHref(
    href: string,
    isProductEnabled: (product: LaunchPortal) => boolean
): boolean {
    const match = DEFERRED_PORTAL_HREF.exec(href);
    if (!match) return false;
    return !isProductEnabled(match[1] as LaunchPortal);
}

/** True when the household hid this local rule at the same fingerprint. */
export function isLocallyHidden(
    candidate: CoachLineCandidate,
    localHidden: CoachLineLocalHidden
): boolean {
    if (candidate.dismiss.kind !== 'local') return false;
    return localHidden[candidate.id] === candidate.dismiss.fingerprint;
}

/**
 * The one line to render: the first candidate, in priority order, that has text and a move,
 * is not hidden on this device and does not point into a deferred portal. `null` renders nothing.
 */
export function selectCoachLineCandidate(
    candidates: readonly CoachLineCandidate[],
    options: {
        localHidden: CoachLineLocalHidden;
        isProductEnabled: (product: LaunchPortal) => boolean;
    }
): CoachLineCandidate | null {
    return (
        candidates.find(
            candidate =>
                candidate.text.trim().length > 0 &&
                candidate.cta.label.trim().length > 0 &&
                candidate.cta.href.length > 0 &&
                !isLocallyHidden(candidate, options.localHidden) &&
                !isDeferredPortalHref(candidate.cta.href, options.isProductEnabled) &&
                !(
                    candidate.secondaryCta &&
                    isDeferredPortalHref(candidate.secondaryCta.href, options.isProductEnabled)
                )
        ) ?? null
    );
}

/** Feed rows that still ask for attention and whose key starts with one of `keyPrefixes`. */
export function feedMessagesForKeys<Message extends Pick<CoachMessage, 'key' | 'dismissedAt'>>(
    messages: readonly Message[],
    keyPrefixes: readonly string[]
): Message[] {
    return messages.filter(
        message =>
            message.dismissedAt === null &&
            message.key !== null &&
            keyPrefixes.some(prefix => message.key!.startsWith(prefix))
    );
}

/**
 * Order feed tips by `keyPrefixes` (priority), then by feed order. The feed itself is ordered
 * by recency, which is not the priority a page wants.
 */
export function orderFeedMessagesByKeys<Message extends Pick<CoachMessage, 'key'>>(
    messages: readonly Message[],
    keyPrefixes: readonly string[]
): Message[] {
    const rank = (message: Message) => {
        const index = keyPrefixes.findIndex(prefix => message.key?.startsWith(prefix));
        return index === -1 ? keyPrefixes.length : index;
    };
    return messages
        .map((message, position) => ({ message, position }))
        .sort(
            (left, right) =>
                rank(left.message) - rank(right.message) || left.position - right.position
        )
        .map(entry => entry.message);
}

/** Optional second move on a feed row (`ctaSecondary*`); only the fixed-costs over-split rule has one. */
export function secondaryCtaOf(
    message: Partial<Pick<CoachMessage, 'ctaSecondaryLabel' | 'ctaSecondaryHref'>>
): CoachLineCta | null {
    if (!message.ctaSecondaryLabel || !message.ctaSecondaryHref) return null;
    return { label: message.ctaSecondaryLabel, href: message.ctaSecondaryHref };
}

/** Fingerprint for a local rule driven by a 0–100 ratio: a new 5-point band re-opens it. */
export function ratioBandFingerprint(period: string, ratioPct: number): string {
    return `${period}:${Math.floor(ratioPct / 5)}`;
}
