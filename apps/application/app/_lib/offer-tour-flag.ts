/**
 * One-shot flag: jar-bank setup finished → home shell should offer the tour.
 * Tab-scoped via sessionStorage (survives the onboarding → `/` navigation).
 */

import { sessionStorageUtil, storageKey } from '@rumtelo/utils';

const OFFER_TOUR_KEY = storageKey('tour', 'offer');

/** Call when onboarding completes and the user is sent home. */
export function markTourOfferPending(): void {
    sessionStorageUtil.setItem(OFFER_TOUR_KEY, true, { expiryDays: null });
}

/** Returns true once if a tour offer was pending, then clears the flag. */
export function consumeTourOfferPending(): boolean {
    const pending = sessionStorageUtil.getItem<boolean>(OFFER_TOUR_KEY) === true;
    sessionStorageUtil.removeItem(OFFER_TOUR_KEY);
    return pending;
}
