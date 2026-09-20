/**
 * Time Template Contract (Energy)
 * oRPC procedures for a person's typical workday / day off.
 */

import { oc } from '@orpc/contract';
import { z } from 'zod';

import { HouseholdScoped } from '../../../../common/common.schema';
import { TimeDayKind } from '../enums';
import { IsoWeekday, TimeMinutesByCategory, TimeTemplate } from './time-template.schema';

// ====================================================================
// ? CREATE Operations
// ====================================================================

/**
 * Upsert both shapes in one call so weekdays can be moved between them atomically.
 * Every weekday 1–7 must be assigned exactly once across the two templates.
 */
export const timeTemplateCreate = oc
    .input(
        HouseholdScoped.extend({
            templates: z
                .array(
                    z.object({
                        kind: z.enum(TimeDayKind),
                        weekdays: z.array(IsoWeekday),
                        minutes: TimeMinutesByCategory.refine(
                            minutes =>
                                Object.values(minutes).reduce((total, value) => total + value, 0) <=
                                1440,
                            'A day has 1440 minutes'
                        ),
                    })
                )
                .length(2)
                .refine(
                    templates => new Set(templates.map(template => template.kind)).size === 2,
                    'One template per day kind'
                )
                .refine(templates => {
                    const assigned = templates
                        .flatMap(template => template.weekdays)
                        .sort((left, right) => left - right);
                    return assigned.join(',') === '1,2,3,4,5,6,7';
                }, 'Every weekday must belong to exactly one template'),
        })
    )
    .output(z.array(TimeTemplate));

// ====================================================================
// ? READ Operations
// ====================================================================

/** The current person's templates (0 or 2), with learned medians when available. */
export const timeTemplateList = oc.input(HouseholdScoped).output(z.array(TimeTemplate));

/** Nested contract object mounted at `contract.energy.timeTemplates`. */
export const timeTemplateContract = {
    create: timeTemplateCreate,
    list: timeTemplateList,
};
