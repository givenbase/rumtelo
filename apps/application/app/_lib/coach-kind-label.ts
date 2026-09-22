import { CoachKind } from '@rumtelo/contracts';
import type { TranslateFn } from '@rumtelo/i18n';

const COACH_KIND_KEYS: Record<
    CoachKind,
    'kind_nudge' | 'kind_win' | 'kind_warning' | 'kind_insight' | 'kind_week_check'
> = {
    [CoachKind.NUDGE]: 'kind_nudge',
    [CoachKind.WIN]: 'kind_win',
    [CoachKind.WARNING]: 'kind_warning',
    [CoachKind.INSIGHT]: 'kind_insight',
    [CoachKind.WEEK_CHECK]: 'kind_week_check',
};

/** Translate a CoachKind enum; null when `kind` is already a custom label (e.g. portal fallback). */
export function coachKindLabel(
    kind: string,
    /** Scoped to `features.coach.verdict`. */
    t: TranslateFn
): string | null {
    if (!Object.values(CoachKind).includes(kind as CoachKind)) return null;
    const key = COACH_KIND_KEYS[kind as CoachKind];
    return t(key);
}

/** CoachKind label, or pass through pre-translated fallback copy. */
export function coachKindDisplay(
    kind: string,
    /** Scoped to `features.coach.verdict`. */
    t: TranslateFn
): string {
    return coachKindLabel(kind, t) ?? kind;
}
