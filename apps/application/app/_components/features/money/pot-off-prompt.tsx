'use client';

import type { OptionalJarKey } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';
import { Button, EmptyState } from '@rumtelo/ui';

import { usePotActivation } from '@/app/_lib/use-pot-activation';

/**
 * A screen that needs an optional pot the household has not turned on. Says what the pot is
 * and, for roles that may change pots, turns it on right here; read-only roles get the
 * explanation without a button. Once the pot exists the shared jar queries refresh and the
 * caller renders its real screen instead of this one.
 */
export function PotOffPrompt({
    jarKey,
    title,
    body,
    ctaLabel,
}: {
    jarKey: OptionalJarKey;
    title: string;
    body: string;
    ctaLabel: string;
}) {
    const tForm = useTranslations('ui.form');
    const { canRefine, activate } = usePotActivation();

    return (
        <EmptyState
            icon="plus"
            title={title}
            body={body}
            action={
                canRefine ? (
                    <Button
                        type="button"
                        className="min-h-11 max-w-full"
                        disabled={activate.isPending}
                        aria-busy={activate.isPending}
                        onClick={() => activate.mutate(jarKey)}>
                        {activate.isPending ? tForm('working') : ctaLabel}
                    </Button>
                ) : undefined
            }
        />
    );
}
