'use client';

import { Button, Typography } from '@rumtelo/ui';
import { useTranslations } from '@rumtelo/i18n';

type TourOfferDialogProps = {
    onAccept: () => void;
    onDismiss: () => void;
};

/** Shown once after household onboarding — opt into the multi-page Joyride series. */
export function TourOfferDialog({ onAccept, onDismiss }: TourOfferDialogProps) {
    const t = useTranslations('features.tour.offer');

    return (
        <>
            <div aria-hidden="true" className="fixed inset-0 z-70 bg-scrim/70" />
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="tour-offer-title"
                className="fixed top-1/2 left-1/2 z-71 w-full max-w-md -translate-1/2 animate-rise rounded-2xl border border-line-strong bg-surface p-6 shadow-xl">
                <Typography as="p" variant="eyebrow" color="primary">
                    {t('eyebrow')}
                </Typography>
                <Typography as="h3" size="lg" id="tour-offer-title" className="mt-2">
                    {t('title')}
                </Typography>
                <Typography as="p" size="sm" color="secondary" className="mt-2">
                    {t('body')}
                </Typography>
                <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <Button type="button" variant="ghost" onClick={onDismiss}>
                        {t('dismiss')}
                    </Button>
                    <Button type="button" onClick={onAccept}>
                        {t('accept')}
                    </Button>
                </div>
            </div>
        </>
    );
}
