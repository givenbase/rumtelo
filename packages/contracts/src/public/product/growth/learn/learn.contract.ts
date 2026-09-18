/**
 * Learn Contract (Growth)
 * oRPC procedures for a person's learning shelf.
 */

import { oc } from '@orpc/contract';
import { z } from 'zod';

import { HouseholdScoped, IsoDate } from '../../../../common/common.schema';
import { LearnProgressStatus } from './enums';
import {
    LearnBookHit,
    LearnProgress,
    LearnShelf,
    LearnSkillKey,
    LearnBook,
    LearnBookDraft,
} from './learn.schema';

const pieceKey = z.string().min(1).max(64);

// ====================================================================
// ? CREATE Operations
// ====================================================================

/** Put a title on the shelf, or move one that is already there. */
export const learnSave = oc
    .input(
        HouseholdScoped.extend({
            pieceKey,
            status: z.enum(LearnProgressStatus),
            skill: LearnSkillKey,
            dueOn: IsoDate.nullable(),
        })
    )
    .output(LearnProgress);

/** Save a book the household found. The pointer lands on their shelf as need-to-read. */
export const learnCreateBook = oc
    .input(HouseholdScoped.extend(LearnBookDraft.shape))
    .output(LearnBook);

// ====================================================================
// ? READ Operations
// ====================================================================

export const learnList = oc.input(HouseholdScoped).output(LearnShelf);

/** Search the public book catalog by name. Nothing is stored. */
export const learnSearchBooks = oc
    .input(HouseholdScoped.extend({ query: z.string().trim().min(2).max(80) }))
    .output(z.array(LearnBookHit));

/** Books this household added. Recommended books stay on the preset shelf. */
export const learnListBooks = oc.input(HouseholdScoped).output(z.array(LearnBook));

// ====================================================================
// ? UPDATE Operations
// ====================================================================

/** A skill is in focus, or it is not. Creating the row is the on switch. */
export const learnFocus = oc
    .input(
        HouseholdScoped.extend({
            skill: LearnSkillKey,
            on: z.boolean(),
        })
    )
    .output(z.object({ skill: LearnSkillKey, on: z.boolean() }));

// ====================================================================
// ? DELETE Operations
// ====================================================================

/** Back on the shelf: the title is no longer picked. */
export const learnRemove = oc
    .input(HouseholdScoped.extend({ pieceKey }))
    .output(z.object({ pieceKey }));

/** Nested contract object mounted at `contract.growth.learn`. */
export const learnContract = {
    save: learnSave,
    createBook: learnCreateBook,
    list: learnList,
    searchBooks: learnSearchBooks,
    listBooks: learnListBooks,
    focus: learnFocus,
    remove: learnRemove,
};
