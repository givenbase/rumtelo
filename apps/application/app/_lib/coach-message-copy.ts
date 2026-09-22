import type { CoachMessage } from '@rumtelo/contracts';
import { TIME_COACH_KEY_PREFIX } from '@rumtelo/contracts';
import type { TranslateFn } from '@rumtelo/i18n';

import { formatMinutes } from '@/app/_lib/time-meta';

type CoachCopySource = Pick<CoachMessage, 'key' | 'text' | 'ctaLabel'>;

type TranslateCoach = (key: string, values?: Record<string, string | number | Date>) => string;

function parseTimeCoachKey(key: string): { rule: string; parts: string[] } | null {
    if (!key.startsWith(TIME_COACH_KEY_PREFIX)) return null;
    const rest = key.slice(TIME_COACH_KEY_PREFIX.length);
    const [rule, ...parts] = rest.split(':');
    if (!rule) return null;
    return { rule, parts };
}

function numberAt(parts: string[], index: number): number | null {
    const value = Number(parts[index]);
    return Number.isFinite(value) ? value : null;
}

/** Localize a persisted coach row; fall back to server English when the key is unknown. */
export function resolveCoachMessage(
    message: CoachCopySource,
    t: TranslateCoach,
    /** Root translator — `useTranslations()` — for {@link formatMinutes} in coach copy. */
    tDuration?: TranslateFn
): { text: string; ctaLabel: string | null } {
    const formatTime = (minutes: number) => formatMinutes(minutes, tDuration);
    const parsed = message.key ? parseTimeCoachKey(message.key) : null;
    if (!parsed) {
        return { text: message.text, ctaLabel: message.ctaLabel };
    }

    const { rule, parts } = parsed;

    switch (rule) {
        case 'needs_setup':
            return {
                text: t('time_coach.needs_setup.text'),
                ctaLabel: t('time_coach.needs_setup.cta'),
            };
        case 'catch_up': {
            const count =
                numberAt(parts, 1) ?? // `{week}:{count}`
                numberAt(parts, 0) ?? // legacy `{week}` only — parse from English
                (() => {
                    const fromText = Number(message.text.match(/^(\d+) days this week/)?.[1]);
                    return Number.isFinite(fromText) ? fromText : 0;
                })();
            return {
                text: t('time_coach.catch_up.text', { count }),
                ctaLabel: t('time_coach.cta.open_week'),
            };
        }
        case 'work_ceiling': {
            const workMinutes =
                numberAt(parts, 1) ??
                parseHoursFromText(message.text, /lands at ([\dh m]+) of work/);
            return {
                text: t('time_coach.work_ceiling.text', {
                    workHours: formatTime(workMinutes ?? 0),
                }),
                ctaLabel: t('time_coach.cta.see_week'),
            };
        }
        case 'exercise_floor': {
            const movingMinutes = numberAt(parts, 1);
            const floorMinutes = numberAt(parts, 2);
            const movingMatch = message.text.match(/has ([\dh m]+) of movement/);
            const floorMatch = message.text.match(/floor is ([\dh m]+)/);
            return {
                text: t('time_coach.exercise_floor.text', {
                    movingHours: formatTime(
                        movingMinutes ?? parseHoursToken(movingMatch?.[1]) ?? 0
                    ),
                    floorHours: formatTime(floorMinutes ?? parseHoursToken(floorMatch?.[1]) ?? 0),
                }),
                ctaLabel: t('time_coach.cta.open_week'),
            };
        }
        case 'free_unsplit': {
            const freeDailyMinutes =
                numberAt(parts, 1) ?? parseHoursToken(message.text.match(/^([\dh m]+) a day/)?.[1]);
            return {
                text: t('time_coach.free_unsplit.text', {
                    freeDaily: formatTime(freeDailyMinutes ?? 0),
                }),
                ctaLabel: t('time_coach.cta.change_typical'),
            };
        }
        case 'social_jetlag': {
            const jetlagMinutes =
                numberAt(parts, 0) ??
                parseHoursFromText(message.text, /sleep in ([\dh m]+) on days off/);
            return {
                text: t('time_coach.social_jetlag.text', {
                    jetlagHours: formatTime(jetlagMinutes ?? 0),
                }),
                ctaLabel: t('time_coach.cta.open_week'),
            };
        }
        case 'work_drift': {
            const statedMinutes = numberAt(parts, 0);
            const typicalMinutes = numberAt(parts, 1);
            const dayCount = numberAt(parts, 2);
            const driftMatch = message.text.match(
                /You set ([\dh m]+) of work; your last (\d+) workdays median ([\dh m]+)/
            );
            return {
                text: t('time_coach.work_drift.text', {
                    statedHours: formatTime(statedMinutes ?? parseHoursToken(driftMatch?.[1]) ?? 0),
                    dayCount:
                        dayCount ??
                        (() => {
                            const fromText = Number(driftMatch?.[2]);
                            return Number.isFinite(fromText) ? fromText : 0;
                        })(),
                    typicalHours: formatTime(
                        typicalMinutes ?? parseHoursToken(driftMatch?.[3]) ?? 0
                    ),
                }),
                ctaLabel: t('time_coach.cta.open_week'),
            };
        }
        case 'week_in_range':
            return {
                text: t('time_coach.week_in_range.text'),
                ctaLabel: t('time_coach.cta.see_week'),
            };
        default:
            return { text: message.text, ctaLabel: message.ctaLabel };
    }
}

function parseHoursFromText(text: string, pattern: RegExp): number | null {
    const match = text.match(pattern);
    return match ? parseHoursToken(match[1]) : null;
}

/** Parse "6h", "6h 30m", or "45m" tokens from legacy English server text. */
function parseHoursToken(token: string | undefined): number | null {
    if (!token) return null;
    const hours = token.match(/(\d+)h/);
    const minutes = token.match(/(\d+)m/);
    const h = hours ? Number(hours[1]) : 0;
    const m = minutes ? Number(minutes[1]) : 0;
    if (!hours && !minutes) return null;
    return h * 60 + m;
}
