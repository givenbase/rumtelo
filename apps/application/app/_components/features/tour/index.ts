/**
 * Help + Joyride tour feature.
 *
 * Copy lives in `@rumtelo/i18n` (`features.tour.*`).
 * `content/i18n-builders.ts` maps paths → translated help/tour steps.
 */
export { PageHelpButton } from './help-button';
export { TourOfferDialog } from './offer-dialog';
export { PageTourProvider, usePageTour } from './provider';
export { buildFullTourChapters, buildPageHelpForPathname, pathWithoutLocale } from './content';
export type {
    FullTourChapter,
    PageHelpContent,
    PageHelpSection,
    PageTourId,
    PageTourStep,
} from './types';
