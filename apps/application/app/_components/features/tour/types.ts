/**
 * Tour / Help types.
 * User-facing copy comes from `@rumtelo/i18n` (`features.tour.*`) via i18n-builders.
 */

export type PageHelpSection = {
    heading: string;
    body: string;
};

/** Spotlight step — `target` is a CSS selector (prefer `[data-tour="…"]`). */
export type PageTourStep = {
    target: string;
    title: string;
    content: string;
};

/** Stable id for progress tracking (account settings). */
export type PageTourId = 'shell' | 'home' | 'income' | 'fixed' | 'jars';

/** Explain ladder slot — L1 general / L2 product / L3 feature. Empty url = hidden until recorded. */
export type PageHelpVideo = {
    level: 'general' | 'product' | 'feature';
    title: string;
    url: string;
};

export type PageHelpContent = {
    title: string;
    sections: PageHelpSection[];
    tourId?: PageTourId;
    tourSteps?: PageTourStep[];
    /** When true, Help starts the multi-page product series (Home). */
    fullTour?: boolean;
    videos?: PageHelpVideo[];
};

export type FullTourChapter = {
    id: PageTourId;
    href: string;
    steps: PageTourStep[];
};

export type HelpSectionCopy = {
    heading: string;
    body: string;
};

export type TourStepCopy = {
    title: string;
    content: string;
};
