/**
 * Learn Schemas (Growth)
 * A person's shelf: which title, where it sits, and when they want it finished.
 * Zod only — no `export type` above the inferred aliases.
 */

import { z } from 'zod';

import { HouseholdId, Id, IsoDate } from '../../../../common/common.schema';
import { LearnProgressStatus } from './enums';

/** ISBN-13. One check for a recommended edition and a household book. */
export const ISBN13 = /^97[89]\d{10}$/;

/**
 * Which skill a title belongs to.
 * A key, not an enum: Money, Communication, and Marketing are the first three,
 * and the next one must not need a database migration.
 */
export const LearnSkillKey = z.string().min(1).max(64);

/**
 * Which learning section a title sits in.
 * A key, like a category key. Saving and Relationships are rows, not enum values.
 */
export const LearnSectionKey = z.string().min(1).max(64);

/** One title the person has picked. Shelf (unpicked) is the absence of a row. */
export const LearnProgress = z.object({
    id: Id,
    householdId: HouseholdId,
    accountId: Id,
    /** Catalog key, or the local id of a course, seminar, or event. */
    pieceKey: z.string().min(1).max(64),
    status: z.enum(LearnProgressStatus),
    skill: LearnSkillKey,
    /** The day they want to be finished. Null until they pick one. */
    dueOn: IsoDate.nullable(),
});

/** The shelf for the signed-in person: picked titles, plus which skills are in focus. */
export const LearnShelf = z.object({
    progress: z.array(LearnProgress),
    focused: z.array(LearnSkillKey),
});

/**
 * A hit from the public book catalog. A pointer only — we do not store the work
 * until the household picks one.
 */
export const LearnBookHit = z.object({
    /** ISBN-13 when we have one, otherwise the catalog key. Unique per household. */
    sourceKey: z.string().min(1).max(64),
    name: z.string().min(1).max(160),
    author: z.string().min(1).max(120),
    coverId: z.number().int().positive().nullable(),
    isbn13: z.string().regex(ISBN13).nullable(),
    url: z.string().url().max(280),
});

/** A book this household added. The pointer, not a title string. */
export const LearnBook = LearnBookHit.extend({
    id: Id,
    householdId: HouseholdId,
    description: z.string().min(1).max(280),
    skill: LearnSkillKey,
    topic: LearnSectionKey,
});

/** What create accepts: the hit, plus which shelf lane it belongs to. */
export const LearnBookDraft = LearnBookHit.extend({
    skill: LearnSkillKey,
    topic: LearnSectionKey,
});

export type LearnProgress = z.infer<typeof LearnProgress>;
export type LearnShelf = z.infer<typeof LearnShelf>;
export type LearnSkillKey = z.infer<typeof LearnSkillKey>;
export type LearnSectionKey = z.infer<typeof LearnSectionKey>;
export type LearnBookHit = z.infer<typeof LearnBookHit>;
export type LearnBook = z.infer<typeof LearnBook>;
export type LearnBookDraft = z.infer<typeof LearnBookDraft>;
