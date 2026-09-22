'use client';

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Joyride, STATUS, type Step, type Styles } from 'react-joyride';
import { useTranslations } from '@rumtelo/i18n';

import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';
import { useApiError } from '@/app/_lib/api-error-messages';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';

import { buildFullTourChapters, pathWithoutLocale } from './content';
import { TourOfferDialog } from './offer-dialog';
import {
    defaultTourProgress,
    isTourDone,
    normalizeTourProgress,
    type TourChapterStatus,
    type TourProgressState,
} from './progress';
import type { PageTourId, PageTourStep } from './types';

type PageTourContextValue = {
    progress: TourProgressState;
    startTour: (tourId: PageTourId, steps: PageTourStep[]) => void;
    requestTourOffer: () => void;
    acceptTourOffer: () => void;
    dismissTourOffer: () => void;
    /** Settings / Help — clear series progress and run the full tour again. */
    restartFullTour: () => void;
    isTourDone: (tourId: string) => boolean;
    /** Open the shell Help sheet for the current route. */
    openHelp: () => void;
    helpOpen: boolean;
    setHelpOpen: (open: boolean) => void;
};

const PageTourContext = createContext<PageTourContextValue | null>(null);

const JOYRIDE_STYLES: Partial<Styles> = {
    tooltip: {
        borderRadius: 12,
        padding: 16,
    },
    tooltipTitle: {
        fontSize: 14,
        fontWeight: 600,
        margin: '0 0 6px',
    },
    tooltipContent: {
        fontSize: 13,
        lineHeight: 1.5,
        padding: 0,
    },
    buttonPrimary: {
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: '0.04em',
        padding: '8px 14px',
        textTransform: 'uppercase' as const,
    },
    buttonBack: {
        color: 'var(--color-fg-muted)',
        fontSize: 12,
        marginRight: 8,
    },
    buttonSkip: {
        color: 'var(--color-fg-faint)',
        fontSize: 12,
    },
};

function toJoyrideSteps(steps: PageTourStep[]): Step[] {
    return steps.map(step => ({
        target: step.target,
        title: step.title,
        content: step.content,
        skipBeacon: true,
        placement: 'auto',
    }));
}

function pathMatchesChapter(pathname: string, href: string): boolean {
    const path = pathWithoutLocale(pathname);
    return path === href || path.startsWith(`${href}/`);
}

export function PageTourProvider({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname() ?? '/';
    const { userId } = useAuth();
    const queryClient = useQueryClient();
    const t = useTranslations('features.tour');
    const { showToast } = useAppShell();
    const apiError = useApiError();
    const fullTourChapters = useMemo(() => buildFullTourChapters(t), [t]);
    const joyrideLocale = useMemo(
        () => ({
            back: t('chrome.joyride.back'),
            close: t('chrome.joyride.close'),
            last: t('chrome.joyride.last'),
            next: t('chrome.joyride.next'),
            skip: t('chrome.joyride.skip'),
        }),
        [t]
    );

    const settingsQuery = useQuery({
        ...apiQuery.account.settings.queryOptions(),
        enabled: Boolean(userId),
    });

    const [progress, setProgress] = useState<TourProgressState>(defaultTourProgress);
    const [hydrated, setHydrated] = useState(false);
    const [run, setRun] = useState(false);
    const [steps, setSteps] = useState<Step[]>([]);
    const [hydratedUserId, setHydratedUserId] = useState<string | null>(null);
    const [helpOpen, setHelpOpen] = useState(false);

    const activeTourIdRef = useRef<PageTourId | null>(null);
    const seriesModeRef = useRef(false);
    const seriesIndexRef = useRef(0);
    const resumeHrefRef = useRef<string | null>(null);
    const startingRef = useRef(false);

    const openHelp = useCallback(() => setHelpOpen(true), []);

    // Hydrate from account.settings when the signed-in user (and their prefs) are ready.
    if (!userId && hydratedUserId !== null) {
        setHydratedUserId(null);
        setProgress(defaultTourProgress());
        setHydrated(false);
    } else if (
        userId &&
        settingsQuery.isSuccess &&
        settingsQuery.data &&
        hydratedUserId !== userId
    ) {
        setHydratedUserId(userId);
        setProgress(normalizeTourProgress(settingsQuery.data.tour));
        setHydrated(true);
    }

    useEffect(() => {
        seriesIndexRef.current = progress.seriesIndex;
    }, [progress.seriesIndex]);

    const persist = useCallback(
        (updater: (previous: TourProgressState) => TourProgressState) => {
            setProgress(previous => {
                const next = updater(previous);
                seriesIndexRef.current = next.seriesIndex;
                if (userId) {
                    void api.account
                        .updateSettings({ tour: next })
                        .then(updated => {
                            queryClient.setQueryData(apiQuery.account.settings.key(), updated);
                        })
                        .catch(error => {
                            console.error('tour progress save failed', error);
                            showToast(apiError(error), 'error');
                        });
                }
                return next;
            });
        },
        [apiError, queryClient, showToast, userId]
    );

    const launchSteps = useCallback(
        (tourId: PageTourId, tourSteps: PageTourStep[], series: boolean) => {
            if (tourSteps.length === 0) return;
            startingRef.current = true;
            activeTourIdRef.current = tourId;
            seriesModeRef.current = series;
            setSteps(toJoyrideSteps(tourSteps));
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setRun(true);
                    startingRef.current = false;
                });
            });
        },
        []
    );

    const startTour = useCallback(
        (tourId: PageTourId, tourSteps: PageTourStep[]) => {
            resumeHrefRef.current = null;
            launchSteps(tourId, tourSteps, false);
        },
        [launchSteps]
    );

    const requestTourOffer = useCallback(() => {
        persist(previous => {
            if (previous.offer === 'accepted' || previous.offer === 'dismissed') {
                return previous;
            }
            return { ...previous, offer: 'pending' };
        });
    }, [persist]);

    const dismissTourOffer = useCallback(() => {
        resumeHrefRef.current = null;
        seriesModeRef.current = false;
        persist(previous => ({
            ...previous,
            offer: 'dismissed',
            seriesActive: false,
            seriesIndex: 0,
        }));
    }, [persist]);

    const goToSeriesIndex = useCallback(
        (index: number) => {
            const chapter = fullTourChapters[index];
            if (!chapter) {
                resumeHrefRef.current = null;
                seriesModeRef.current = false;
                persist(previous => ({
                    ...previous,
                    seriesActive: false,
                    seriesIndex: 0,
                }));
                return;
            }

            persist(previous => ({
                ...previous,
                offer: 'accepted',
                seriesActive: true,
                seriesIndex: index,
            }));

            if (pathMatchesChapter(pathname, chapter.href)) {
                resumeHrefRef.current = null;
                launchSteps(chapter.id, chapter.steps, true);
            } else {
                resumeHrefRef.current = chapter.href;
                seriesModeRef.current = true;
                router.push(chapter.href);
            }
        },
        [fullTourChapters, launchSteps, pathname, persist, router]
    );

    const acceptTourOffer = useCallback(() => {
        goToSeriesIndex(0);
    }, [goToSeriesIndex]);

    const restartFullTour = useCallback(() => {
        resumeHrefRef.current = null;
        seriesModeRef.current = false;
        setRun(false);
        setSteps([]);
        activeTourIdRef.current = null;

        const seriesIds = new Set(fullTourChapters.map(chapter => chapter.id));
        persist(previous => {
            const tours = { ...previous.tours };
            for (const id of seriesIds) {
                delete tours[id];
            }
            return {
                ...previous,
                offer: 'accepted',
                tours,
                seriesActive: false,
                seriesIndex: 0,
            };
        });
        requestAnimationFrame(() => goToSeriesIndex(0));
    }, [fullTourChapters, goToSeriesIndex, persist]);

    useEffect(() => {
        let timer: number | undefined;
        if (hydrated && progress.seriesActive && !run && !startingRef.current) {
            const expected = resumeHrefRef.current;
            const chapter = fullTourChapters[progress.seriesIndex];
            if (
                expected &&
                chapter &&
                chapter.href === expected &&
                pathMatchesChapter(pathname, chapter.href)
            ) {
                timer = window.setTimeout(() => {
                    resumeHrefRef.current = null;
                    launchSteps(chapter.id, chapter.steps, true);
                }, 280);
            }
        }
        return () => {
            if (timer !== undefined) window.clearTimeout(timer);
        };
    }, [
        fullTourChapters,
        hydrated,
        progress.seriesActive,
        progress.seriesIndex,
        pathname,
        run,
        launchSteps,
    ]);

    const value = useMemo<PageTourContextValue>(
        () => ({
            progress,
            startTour,
            requestTourOffer,
            acceptTourOffer,
            dismissTourOffer,
            restartFullTour,
            isTourDone: (tourId: string) => isTourDone(progress, tourId),
            openHelp,
            helpOpen,
            setHelpOpen,
        }),
        [
            progress,
            startTour,
            requestTourOffer,
            acceptTourOffer,
            dismissTourOffer,
            restartFullTour,
            openHelp,
            helpOpen,
        ]
    );

    return (
        <PageTourContext.Provider value={value}>
            {children}
            {hydrated && progress.offer === 'pending' ? (
                <TourOfferDialog onAccept={acceptTourOffer} onDismiss={dismissTourOffer} />
            ) : null}
            {steps.length > 0 ? (
                <Joyride
                    continuous
                    run={run}
                    steps={steps}
                    scrollToFirstStep
                    options={{
                        zIndex: 10_000,
                        primaryColor: 'var(--color-accent)',
                        textColor: 'var(--color-fg)',
                        backgroundColor: 'var(--color-raised)',
                        arrowColor: 'var(--color-raised)',
                        overlayColor: 'rgba(0, 0, 0, 0.55)',
                        showProgress: true,
                        buttons: ['back', 'close', 'primary', 'skip'],
                        skipBeacon: true,
                    }}
                    styles={JOYRIDE_STYLES}
                    locale={joyrideLocale}
                    onEvent={data => {
                        const finished =
                            data.type === 'tour:end' ||
                            data.status === STATUS.FINISHED ||
                            data.status === STATUS.SKIPPED;
                        if (!finished) return;

                        const tourId = activeTourIdRef.current;
                        const wasSeries = seriesModeRef.current;
                        const skipped = data.status === STATUS.SKIPPED;
                        const fromIndex = seriesIndexRef.current;

                        setRun(false);
                        setSteps([]);
                        activeTourIdRef.current = null;

                        const status: TourChapterStatus = skipped ? 'skipped' : 'completed';

                        if (skipped) {
                            resumeHrefRef.current = null;
                            seriesModeRef.current = false;
                            persist(previous => ({
                                ...previous,
                                ...(tourId
                                    ? { tours: { ...previous.tours, [tourId]: status } }
                                    : {}),
                                seriesActive: false,
                                seriesIndex: 0,
                            }));
                            return;
                        }

                        if (wasSeries) {
                            const nextIndex = fromIndex + 1;
                            persist(previous => ({
                                ...previous,
                                ...(tourId
                                    ? { tours: { ...previous.tours, [tourId]: status } }
                                    : {}),
                            }));
                            requestAnimationFrame(() => goToSeriesIndex(nextIndex));
                        } else {
                            seriesModeRef.current = false;
                            if (tourId) {
                                persist(previous => ({
                                    ...previous,
                                    tours: { ...previous.tours, [tourId]: status },
                                }));
                            }
                        }
                    }}
                />
            ) : null}
        </PageTourContext.Provider>
    );
}

export function usePageTour() {
    const ctx = useContext(PageTourContext);
    if (!ctx) {
        throw new Error('usePageTour must be used within PageTourProvider');
    }
    return ctx;
}
