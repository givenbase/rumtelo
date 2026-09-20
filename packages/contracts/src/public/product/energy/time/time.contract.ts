/**
 * Time Contract (Energy)
 * oRPC procedures for daily time entries and the weekly summary against evidence bands.
 */

import { oc } from '@orpc/contract';
import { z } from 'zod';

import { HouseholdScoped, Id, IsoDate, WeekKey } from '../../../../common/common.schema';
import { TimeCategory } from '../enums';
import { TimeEntry, TimeWeekSummary } from './time.schema';

// ====================================================================
// ? CREATE Operations
// ====================================================================

/**
 * Record one day in a single round-trip. Each category is upserted for the
 * current person; categories left out are untouched. Total may not exceed 24 h.
 */
export const timeEntryCreate = oc
    .input(
        HouseholdScoped.extend({
            on: IsoDate,
            entries: z
                .array(
                    z.object({
                        category: z.enum(TimeCategory),
                        minutes: z.int().min(0).max(1440),
                        note: z.string().max(280).nullish(),
                    })
                )
                .min(1)
                .max(Object.keys(TimeCategory).length)
                .refine(
                    entries =>
                        new Set(entries.map(entry => entry.category)).size === entries.length,
                    'One entry per category'
                )
                .refine(
                    entries => entries.reduce((total, entry) => total + entry.minutes, 0) <= 1440,
                    'A day has 1440 minutes'
                ),
        })
    )
    .output(z.array(TimeEntry));

// ====================================================================
// ? READ Operations
// ====================================================================

export const timeEntryList = oc
    .input(
        HouseholdScoped.extend({
            from: IsoDate.nullish(),
            to: IsoDate.nullish(),
        })
    )
    .output(z.array(TimeEntry));

/** Weekly totals per category with band status; defaults to the current ISO week. */
export const timeEntrySummary = oc
    .input(HouseholdScoped.extend({ week: WeekKey.nullish() }))
    .output(TimeWeekSummary);

// ====================================================================
// ? DELETE Operations
// ====================================================================

export const timeEntryDelete = oc.input(HouseholdScoped.extend({ id: Id })).output(z.void());

/** Nested contract object mounted at `contract.energy.time`. */
export const timeEntryContract = {
    create: timeEntryCreate,
    list: timeEntryList,
    summary: timeEntrySummary,
    delete: timeEntryDelete,
};
