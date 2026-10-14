'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

import {
    Button,
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    Typography,
} from '@rumtelo/ui';
import { useTranslations } from '@rumtelo/i18n';
import { cn } from '@rumtelo/utils';

import { useFeatureHelpers } from '@/components/features/helpers';

import { buildPageHelpForPathname } from './content';
import { usePageTour } from './provider';

/** Shell Help — brief for the current route, helpers toggle, optional Joyride tour. */
export function PageHelpButton() {
    const pathname = usePathname() ?? '/';
    const t = useTranslations('features.tour');
    const tUi = useTranslations();
    const help = useMemo(() => buildPageHelpForPathname(pathname, t), [pathname, t]);
    const { startTour, restartFullTour, isTourDone, helpOpen, setHelpOpen } = usePageTour();
    const { helpersEnabled, setHelpersEnabled } = useFeatureHelpers();
    const isFullTour = Boolean(help.fullTour);
    const hasTour = isFullTour || Boolean(help.tourId && (help.tourSteps?.length ?? 0) > 0);
    const replay = isFullTour
        ? (['home', 'shell', 'jars', 'fixed', 'income'] as const).some(id => isTourDone(id))
        : help.tourId
          ? isTourDone(help.tourId)
          : false;
    // Slots without a recorded video stay hidden — no "coming soon" placeholders for customers.
    const videos = help.videos?.filter(video => video.url.trim()) ?? [];

    return (
        <Sheet open={helpOpen} onOpenChange={setHelpOpen}>
            <button
                type="button"
                data-tour="shell-help"
                aria-label={t('chrome.help_trigger')}
                onClick={() => setHelpOpen(true)}
                className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-xs font-semibold tracking-wide uppercase transition-colors sm:px-3.5',
                    'border-accent bg-accent/10 text-accent hover:bg-accent/15'
                )}>
                <span
                    aria-hidden
                    className="grid size-4 place-items-center rounded-full bg-accent text-[10px] font-bold text-on-accent">
                    ?
                </span>
                <span className="hidden sm:inline">{t('chrome.help_trigger')}</span>
            </button>
            <SheetContent
                side="right"
                closeLabel={tUi('ui.button.actions.close')}
                className="flex flex-col gap-0 overflow-hidden border-line bg-surface p-0 text-fg sm:max-w-md">
                <SheetHeader className="shrink-0 space-y-0 border-b border-line bg-raised px-5 py-4 pr-12 text-left">
                    <p className="font-mono text-[10px] font-semibold tracking-widest text-fg-faint uppercase">
                        {t('chrome.sheet_eyebrow')}
                    </p>
                    <SheetTitle>{help.title}</SheetTitle>
                    <SheetDescription>{t('chrome.sheet_description')}</SheetDescription>
                </SheetHeader>

                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-5">
                    {help.sections.map(section => (
                        <section key={section.heading} className="grid gap-1.5">
                            <h3 className="font-mono text-[10px] font-semibold tracking-widest text-accent uppercase">
                                {section.heading}
                            </h3>
                            <Typography as="p" size="sm" color="secondary" className="text-pretty">
                                {section.body}
                            </Typography>
                        </section>
                    ))}

                    {videos.length > 0 ? (
                        <section className="grid gap-3 border-t border-line pt-5">
                            <h3 className="font-mono text-[10px] font-semibold tracking-widest text-accent uppercase">
                                {t('chrome.videos_eyebrow')}
                            </h3>
                            <ul className="grid gap-2">
                                {videos.map(video => {
                                    const levelLabel =
                                        video.level === 'general'
                                            ? t('chrome.video_level_general')
                                            : video.level === 'product'
                                              ? t('chrome.video_level_product')
                                              : t('chrome.video_level_feature');
                                    return (
                                        <li
                                            key={`${video.level}-${video.title}`}
                                            className="rounded-xl border border-line bg-raised px-3 py-3">
                                            <p className="font-mono text-[10px] font-medium tracking-wide text-fg-faint uppercase">
                                                {levelLabel}
                                            </p>
                                            <p className="mt-1 text-sm font-medium text-fg">
                                                {video.title}
                                            </p>
                                            <a
                                                href={video.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="mt-2 inline-flex text-xs font-semibold text-accent underline-offset-2 hover:underline">
                                                {t('chrome.video_watch')}
                                            </a>
                                        </li>
                                    );
                                })}
                            </ul>
                        </section>
                    ) : null}
                </div>

                <div className="shrink-0 space-y-3 border-t border-line bg-raised px-5 py-4">
                    <button
                        type="button"
                        onClick={() => setHelpersEnabled(!helpersEnabled)}
                        className="flex w-full items-center justify-between gap-3 rounded-xl border border-line bg-surface px-3 py-3 text-left transition-colors hover:border-accent/40">
                        <span className="min-w-0">
                            <span className="block text-sm font-medium text-fg">
                                {t('chrome.helpers_label')}
                            </span>
                            <Typography
                                as="span"
                                variant="caption"
                                color="muted"
                                className="mt-0.5 block">
                                {t('chrome.helpers_hint')}
                            </Typography>
                        </span>
                        <span
                            className={cn(
                                'relative h-5 w-9 shrink-0 rounded-full transition-colors',
                                helpersEnabled ? 'bg-accent' : 'bg-line'
                            )}
                            aria-hidden>
                            <span
                                className={cn(
                                    'absolute top-0.5 size-3.5 rounded-full bg-surface shadow-sm transition-[left]',
                                    helpersEnabled ? 'left-[18px]' : 'left-0.5'
                                )}
                            />
                        </span>
                        <span className="sr-only">
                            {helpersEnabled ? t('chrome.helpers_on') : t('chrome.helpers_off')}
                        </span>
                    </button>

                    {hasTour && (isFullTour || help.tourId) ? (
                        <div className="grid gap-2">
                            <Typography as="p" size="sm" color="muted">
                                {isFullTour
                                    ? replay
                                        ? t('chrome.replay_full_tour_prompt')
                                        : t('chrome.take_full_tour_prompt')
                                    : replay
                                      ? t('chrome.replay_tour_prompt')
                                      : t('chrome.take_tour_prompt')}
                            </Typography>
                            <Button
                                type="button"
                                className="w-full"
                                onClick={() => {
                                    setHelpOpen(false);
                                    if (isFullTour) {
                                        restartFullTour();
                                        return;
                                    }
                                    const steps = help.tourSteps ?? [];
                                    const tourId = help.tourId!;
                                    startTour(tourId, steps);
                                }}>
                                {isFullTour
                                    ? replay
                                        ? t('chrome.replay_full_tour')
                                        : t('chrome.take_full_tour')
                                    : replay
                                      ? t('chrome.replay_tour')
                                      : t('chrome.take_tour')}
                            </Button>
                        </div>
                    ) : (
                        <Typography as="p" variant="caption" className="text-fg-faint">
                            {t('chrome.no_tour')}
                        </Typography>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
