'use client';

import { useState, type ReactNode } from 'react';

import { mainJarKeyFor, type OptionalJarKey } from '@rumtelo/contracts';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import {
    Button,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@rumtelo/ui';

import { formatShare } from '@/app/_lib/jar-group';
import { useJarName } from '@/app/_lib/use-jar-name';
import { usePotActivation } from '@/app/_lib/use-pot-activation';

import type { RefineJar } from './jars-refine-group';

/**
 * Everything `JarsRefineGroup` needs from its parent, in one place so Settings › Pots and the
 * pots board turn pots on and off the same way: the mutations (`usePotActivation`), which pot is
 * pending, and the confirmation for turning one off. Render `dialog` once next to the groups.
 */
export function usePotRefineControls(): {
    canRefine: boolean;
    /** Every pot the household has, as saved. */
    jars: ReturnType<typeof usePotActivation>['jars'];
    /** True once the pot list has loaded for a signed-in household. */
    jarsLoaded: boolean;
    pendingKey: string | null;
    onTurnOn: (key: OptionalJarKey) => void;
    onTurnOff: (jar: RefineJar) => void;
    dialog: ReactNode;
} {
    const { canRefine, jars, jarsLoaded, activate, deactivate } = usePotActivation();
    const [turnOffJar, setTurnOffJar] = useState<RefineJar | null>(null);

    const pendingKey = activate.isPending
        ? (activate.variables ?? null)
        : deactivate.isPending
          ? (deactivate.variables?.key ?? null)
          : null;

    return {
        canRefine,
        jars,
        jarsLoaded,
        pendingKey,
        onTurnOn: key => activate.mutate(key),
        onTurnOff: setTurnOffJar,
        dialog: (
            <TurnOffPotDialog
                jar={turnOffJar}
                jars={jars}
                isPending={deactivate.isPending}
                onClose={() => setTurnOffJar(null)}
                onConfirm={jar => deactivate.mutate(jar, { onSettled: () => setTurnOffJar(null) })}
            />
        ),
    };
}

/** Turning a pot off moves its share back; ask once, in the same dialog style as the rest of the app. */
function TurnOffPotDialog({
    jar,
    jars,
    isPending,
    onClose,
    onConfirm,
}: {
    jar: RefineJar | null;
    jars: readonly RefineJar[];
    isPending: boolean;
    onClose: () => void;
    onConfirm: (jar: RefineJar) => void;
}) {
    const tGroups = useTranslations('features.money.groups');
    const tAction = useTranslations('ui.button.actions');
    const tSettings = useTranslations('pages.settings');
    const locale = useLocale();
    const jarName = useJarName();

    return (
        <Dialog
            open={jar !== null}
            onOpenChange={open => {
                if (!open && !isPending) onClose();
            }}>
            <DialogContent className="sm:max-w-md" closeLabel={tAction('close')}>
                {jar ? (
                    <>
                        <DialogHeader>
                            <DialogTitle>{jarName(jar)}</DialogTitle>
                            <DialogDescription>
                                {tGroups('refine.turn_off_effect', {
                                    share: formatShare(jar.percentage, locale),
                                    main: jarName(
                                        jars.find(row => row.key === mainJarKeyFor(jar.key)) ?? jar
                                    ),
                                })}
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="secondary"
                                disabled={isPending}
                                onClick={onClose}>
                                {tAction('cancel')}
                            </Button>
                            <Button
                                type="button"
                                disabled={isPending}
                                onClick={() => onConfirm(jar)}>
                                {isPending ? tSettings('working') : tGroups('refine.turn_off')}
                            </Button>
                        </DialogFooter>
                    </>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}
