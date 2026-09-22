import type { CoachStep } from '@rumtelo/contracts';
import { EnergyMetric } from '@rumtelo/contracts';

type Translate = (key: string, values?: Record<string, string | number>) => string;

/**
 * Localize the active step prompt from payload + i18n.
 * Backend `prompt` stays as English fallback for unknown / future kinds.
 */
export function localizeCoachStepPrompt(
    step: CoachStep,
    t: Translate,
    formatMoney: (cents: number) => string
): string {
    switch (step.payload.type) {
        case 'inbox_sort': {
            const who =
                step.payload.counterparty?.trim() ||
                step.payload.description.trim() ||
                t('prompt_inbox_fallback');
            return t('prompt_inbox', {
                who,
                amount: formatMoney(step.payload.amount),
            });
        }
        case 'due_bill':
            return t('prompt_due_bill', {
                name: step.payload.name,
                amount: formatMoney(step.payload.amount),
            });
        case 'time_day':
            return t('prompt_time_day', {
                day: step.payload.dayLabel,
                kind: step.payload.kindLabel === 'workday' ? t('kind_workday') : t('kind_day_off'),
            });
        case 'time_catch_up':
            return t('prompt_time_catch_up', { count: step.payload.count });
        case 'gratitude':
            return t('prompt_gratitude');
        case 'energy_score':
            switch (step.payload.metric) {
                case EnergyMetric.SLEEP:
                    return t('prompt_score_sleep');
                case EnergyMetric.FOOD:
                    return t('prompt_score_food');
                case EnergyMetric.TRAIN:
                    return t('prompt_score_train');
                case EnergyMetric.MIND:
                    return t('prompt_score_mind');
                default:
                    return step.prompt;
            }
        case 'week_check_look':
            return t('prompt_week_look');
        case 'week_check_redirect':
            return step.payload.surplus > 0
                ? t('prompt_week_redirect', { amount: formatMoney(step.payload.surplus) })
                : t('prompt_week_redirect_empty');
        case 'week_check_intend':
            return t('prompt_week_intend');
        case 'link':
            return t('prompt_time_setup');
        default:
            return step.prompt;
    }
}

/** Localized escape-hatch label for the step footer. */
export function localizeCoachStepHrefLabel(step: CoachStep, t: Translate): string {
    switch (step.payload.type) {
        case 'inbox_sort':
            return t('href_sort_rest');
        case 'due_bill':
            return t('href_open_bill');
        case 'time_day':
        case 'time_catch_up':
            return t('href_open_week');
        case 'link':
            return t('href_setup_week');
        case 'gratitude':
            return t('href_gratitude');
        case 'week_check_look':
        case 'week_check_redirect':
        case 'week_check_intend':
            return t('href_full_check');
        default:
            return step.hrefLabel ?? t('open');
    }
}
