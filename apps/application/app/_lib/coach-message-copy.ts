import type { CoachMessage } from '@rumtelo/contracts';
import { MONEY_COACH_KEY_PREFIX, TIME_COACH_KEY_PREFIX } from '@rumtelo/contracts';
import type { TranslateFn } from '@rumtelo/i18n';

import { formatMinutes } from '@/app/_lib/time-meta';

type CoachCopySource = Pick<CoachMessage, 'key' | 'text' | 'ctaLabel'>;

/** What a rule needs to say its numbers in the household's language and currency. */
export type CoachCopyContext = {
    /** Integer minor units → money string (household currency, active locale via `Intl`). */
    formatMoney: (cents: number) => string;
    /** The household's own name for the Necessities jar; null while the catalog loads. */
    necessitiesJarName: string | null;
};

type TranslateCoach = (key: string, values?: Record<string, string | number | Date>) => string;

function parsePrefixedCoachKey(
    key: string,
    prefix: string
): { rule: string; parts: string[] } | null {
    if (!key.startsWith(prefix)) return null;
    const rest = key.slice(prefix.length);
    const [rule, ...parts] = rest.split(':');
    if (!rule) return null;
    return { rule, parts };
}

function parseTimeCoachKey(key: string): { rule: string; parts: string[] } | null {
    return parsePrefixedCoachKey(key, TIME_COACH_KEY_PREFIX);
}

function parseMoneyCoachKey(key: string): { rule: string; parts: string[] } | null {
    return parsePrefixedCoachKey(key, MONEY_COACH_KEY_PREFIX);
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
    tDuration?: TranslateFn,
    /** Needed for rules whose sentence carries money or a jar name (fixed-costs rules). */
    context?: CoachCopyContext
): { text: string; ctaLabel: string | null } {
    const formatTime = (minutes: number) => formatMinutes(minutes, tDuration);
    const moneyParsed = message.key ? parseMoneyCoachKey(message.key) : null;
    if (moneyParsed) {
        const localized = resolveMoneyCoachMessage(moneyParsed.rule, moneyParsed.parts, t, context);
        // A sentence that cannot be built (unknown rule, unparsable key, no context) falls back
        // to the server text; the move is still localized by rule.
        return {
            text: localized.text || message.text,
            ctaLabel: localized.ctaLabel ?? message.ctaLabel,
        };
    }
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

function resolveMoneyCoachMessage(
    rule: string,
    parts: string[],
    t: TranslateCoach,
    context?: CoachCopyContext
): { text: string; ctaLabel: string | null } {
    switch (rule) {
        case 'due_bills': {
            const count = numberAt(parts, 1) ?? numberAt(parts, 0) ?? 0;
            return {
                text:
                    count === 1
                        ? t('money_coach.due_bills.text_one')
                        : t('money_coach.due_bills.text_other', { count }),
                ctaLabel: t('money_coach.due_bills.cta'),
            };
        }
        case 'inbox_unsorted': {
            const count = numberAt(parts, 1) ?? numberAt(parts, 0) ?? 0;
            return {
                text: t('money_coach.inbox_unsorted.text', { count }),
                ctaLabel: t('money_coach.inbox_unsorted.cta'),
            };
        }
        case 'necessities_share': {
            const pct = numberAt(parts, 1) ?? numberAt(parts, 0) ?? 0;
            return {
                text: t('money_coach.necessities_share.text', { pct }),
                ctaLabel: t('money_coach.necessities_share.cta'),
            };
        }
        // Keys carry the numbers: `over_necessities:<period>:<shortfallCents>`,
        // `business_leak:<period>:<monthlyOutCents>:<billCount>`,
        // `subscription_review:<quarter>:<count>:<monthlyCents>`.
        case 'fixed_costs.over_necessities': {
            const shortfall = numberAt(parts, 1);
            return {
                text:
                    context?.necessitiesJarName && shortfall !== null
                        ? t('money_coach.fixed_costs.over_necessities.text', {
                              jar: context.necessitiesJarName,
                              amount: context.formatMoney(shortfall),
                          })
                        : '',
                ctaLabel: t('money_coach.fixed_costs.over_necessities.cta'),
            };
        }
        case 'fixed_costs.business_leak': {
            const monthlyOut = numberAt(parts, 1);
            return {
                text:
                    context && monthlyOut !== null
                        ? t('money_coach.fixed_costs.business_leak.text', {
                              amount: context.formatMoney(monthlyOut),
                          })
                        : '',
                ctaLabel: t('money_coach.fixed_costs.business_leak.cta'),
            };
        }
        case 'fixed_costs.subscription_review': {
            const count = numberAt(parts, 1);
            const monthly = numberAt(parts, 2);
            return {
                text:
                    context && count !== null && monthly !== null
                        ? t(
                              count === 1
                                  ? 'money_coach.fixed_costs.subscription_review.text_one'
                                  : 'money_coach.fixed_costs.subscription_review.text_other',
                              { count, amount: context.formatMoney(monthly) }
                          )
                        : '',
                ctaLabel: t('money_coach.fixed_costs.subscription_review.cta'),
            };
        }
        default:
            return { text: '', ctaLabel: null };
    }
}

/**
 * Localized label for a feed row's optional second move. Only the fixed-costs over-split rule
 * has one today; other rules keep the server label.
 */
export function resolveCoachSecondaryCtaLabel(
    message: Pick<CoachMessage, 'key'>,
    serverLabel: string,
    t: TranslateCoach
): string {
    const parsed = message.key ? parseMoneyCoachKey(message.key) : null;
    if (parsed?.rule === 'fixed_costs.over_necessities') {
        return t('money_coach.fixed_costs.over_necessities.cta_secondary');
    }
    return serverLabel;
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
    const hourCount = hours ? Number(hours[1]) : 0;
    const minuteCount = minutes ? Number(minutes[1]) : 0;
    if (!hours && !minutes) return null;
    return hourCount * 60 + minuteCount;
}
