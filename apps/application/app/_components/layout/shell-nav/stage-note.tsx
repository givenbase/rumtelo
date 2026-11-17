'use client';

import { useEffect, useSyncExternalStore } from 'react';

import { useLocale, useTranslations } from '@rumtelo/i18n';
import { Button } from '@rumtelo/ui';
import { localStorageUtil, storageKey } from '@rumtelo/utils';

import {
    decideStageNote,
    isBoardStage,
    type BoardStage,
    type StageNoteDecision,
} from '@/app/_lib/board-stage';
import { stageItemLabelKey, type StageItem } from '@/app/_lib/nav';

const SEEN_EVENT = 'rumtelo:board-stage-seen';
/** Server and first client render: nothing is known yet, so nothing is shown. */
const UNREAD = 'unread';

function subscribeSeen(onChange: () => void): () => void {
    window.addEventListener('storage', onChange);
    window.addEventListener(SEEN_EVENT, onChange);
    return () => {
        window.removeEventListener('storage', onChange);
        window.removeEventListener(SEEN_EVENT, onChange);
    };
}

function writeSeenStage(key: string, stage: BoardStage): void {
    localStorageUtil.setItem(key, stage, { expiryDays: null });
    window.dispatchEvent(new Event(SEEN_EVENT));
}

const NONE: StageNoteDecision = { action: 'none' };

/**
 * One quiet note under the header when the board reaches a stage that adds menu items:
 * "New: Goals and The Coach are now in your menu." Shown once per household and device
 * (`localStorage`, no server write). The first visit on a device only remembers the stage,
 * so a member joining a mature board never sees "New:". No icon, no confetti, no score.
 */
export function StageNote({
    householdId,
    stage,
    ready,
    suppressed,
    additionsSince,
    dismissSignal,
}: {
    householdId: string | null;
    stage: BoardStage;
    ready: boolean;
    /** Practice preview or "Show everything now": the whole board is already there. */
    suppressed: boolean;
    additionsSince: (from: BoardStage) => StageItem[];
    /** Flips to true when the person opens More: they have seen the menu. */
    dismissSignal: boolean;
}) {
    const t = useTranslations();
    const locale = useLocale();
    const key = householdId ? storageKey('board-stage-seen', householdId) : null;
    const stored = useSyncExternalStore(
        subscribeSeen,
        () => (key ? (localStorageUtil.getItem<string>(key) ?? '') : UNREAD),
        () => UNREAD
    );

    const loaded = key !== null && stored !== UNREAD;
    const seen = isBoardStage(stored) ? stored : null;
    const decision = loaded && ready ? decideStageNote(seen, stage, suppressed) : NONE;
    // A note that would only mention the month-score level repeats what the score shows.
    const items =
        decision.action === 'show'
            ? additionsSince(decision.from).filter(item => item.kind === 'nav')
            : [];
    const showNote = decision.action === 'show' && items.length > 0;
    // First visit on a device, a fallen stage, or a rise with nothing to announce.
    const remember = decision.action === 'remember' || (decision.action === 'show' && !showNote);

    useEffect(() => {
        if (key && remember) writeSeenStage(key, stage);
    }, [key, remember, stage]);

    useEffect(() => {
        if (key && showNote && dismissSignal) writeSeenStage(key, stage);
    }, [key, showNote, dismissSignal, stage]);

    if (!showNote || !key) return null;

    const list = new Intl.ListFormat(locale, { type: 'conjunction' }).format(
        items.map(item => t(stageItemLabelKey(item)))
    );

    return (
        <div
            role="status"
            className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-line bg-accent-soft px-4 py-3">
            <p className="min-w-0 flex-1 text-sm text-pretty text-fg">
                {t('pages.nav.stage_note.text', { count: items.length, items: list })}
            </p>
            <Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-h-11"
                onClick={() => writeSeenStage(key, stage)}>
                {t('pages.nav.stage_note.dismiss')}
            </Button>
        </div>
    );
}
