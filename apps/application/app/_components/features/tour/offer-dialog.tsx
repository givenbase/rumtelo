'use client';

import { Button, Typography } from '@rumtelo/ui';

import { offer } from './content';

type TourOfferDialogProps = {
    onAccept: () => void;
    onDismiss: () => void;
};

/** Shown once after household onboarding — opt into the multi-page Joyride series. */
export function TourOfferDialog({ onAccept, onDismiss }: TourOfferDialogProps) {
    return (
        <>
            <div aria-hidden="true" className="fixed inset-0 z-70 bg-scrim/70" />
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="tour-offer-title"
                className="fixed top-1/2 left-1/2 z-71 w-full max-w-md -translate-1/2 animate-rise rounded-2xl border border-line-strong bg-surface p-6 shadow-xl">
                <Typography as="p" variant="eyebrow" color="primary">
                    {offer.eyebrow}
                </Typography>
                <Typography as="h3" size="lg" id="tour-offer-title" className="mt-2">
                    {offer.title}
                </Typography>
                <Typography as="p" size="sm" color="secondary" className="mt-2">
                    {offer.body}
                </Typography>
                <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <Button type="button" variant="ghost" onClick={onDismiss}>
                        {offer.dismiss}
                    </Button>
                    <Button type="button" onClick={onAccept}>
                        {offer.accept}
                    </Button>
                </div>
            </div>
        </>
    );
}
