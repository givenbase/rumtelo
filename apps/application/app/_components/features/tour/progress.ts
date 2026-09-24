import {
    DEFAULT_ACCOUNT_TOUR_PROGRESS,
    type AccountTourChapterStatus,
    type AccountTourOfferStatus,
    type AccountTourProgress,
} from '@rumtelo/contracts';

/** App alias for account-settings `tour` bag. */
export type TourProgressState = AccountTourProgress;
export type TourChapterStatus = AccountTourChapterStatus;
export type TourOfferStatus = AccountTourOfferStatus;

export function defaultTourProgress(): TourProgressState {
    return {
        ...DEFAULT_ACCOUNT_TOUR_PROGRESS,
        tours: {},
    };
}

export function normalizeTourProgress(
    tour: AccountTourProgress | null | undefined
): TourProgressState {
    if (!tour) return defaultTourProgress();
    return {
        offer: tour.offer ?? DEFAULT_ACCOUNT_TOUR_PROGRESS.offer,
        tours: tour.tours ?? {},
        seriesActive: tour.seriesActive ?? false,
        seriesIndex: Math.max(0, Math.floor(tour.seriesIndex ?? 0)),
    };
}

export function isTourDone(state: TourProgressState, tourId: string): boolean {
    const status = state.tours[tourId];
    return status === 'completed' || status === 'skipped';
}
