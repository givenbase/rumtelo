'use client';

import { useSyncExternalStore } from 'react';

import { HouseholdRole } from '@rumtelo/contracts';

import { CAPABILITIES, PlanKey } from '@/app/_lib/plan';
import { useBoardWriteAccess } from '@/app/_lib/use-board-write-access';
import { LockCard } from '@/components/features/shell/lock-card';
import { usePracticePreview } from '@/components/features/shell/practice-preview';

/** "Not now" hides the card for this browser session only. */
const HIDDEN_KEY = 'rumtelo.coursePreview.hidden';
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

function readHidden(): boolean {
    try {
        return window.sessionStorage.getItem(HIDDEN_KEY) === '1';
    } catch {
        return false;
    }
}

function hideForSession() {
    try {
        window.sessionStorage.setItem(HIDDEN_KEY, '1');
    } catch {
        // Storage blocked: the card simply stays; nothing else depends on it.
    }
    for (const listener of listeners) listener();
}

/**
 * What Course does, with the Plus price, on top of the Basic goals list (so a first tap on
 * Growth never meets a wall). Not for a VIEWER, a Practice preview or an unknown role.
 */
export function CoursePreviewCard() {
    const hidden = useSyncExternalStore(subscribe, readHidden, () => false);
    const { capabilities } = usePracticePreview();
    const { membershipRole } = useBoardWriteAccess();

    if (
        hidden ||
        capabilities.active ||
        !membershipRole ||
        membershipRole === HouseholdRole.VIEWER
    ) {
        return null;
    }
    return (
        <div className="mb-6">
            <LockCard
                capabilityKey={CAPABILITIES.growthCourse}
                requiredPlan={PlanKey.PLUS}
                variant="compact"
                onNotNow={hideForSession}
            />
        </div>
    );
}
