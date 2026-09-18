/**
 * Catalogs Schemas (Growth)
 * Postures, wealth stages, and lever presets from backoffice.
 * Zod only — no `export type`.
 */

import { z } from 'zod';

import { CatalogItemBase, Money } from '../../../../common/common.schema';
import { PlanKey } from '../../../../backoffice/plan/enums';
import { SpendingStyle } from '../../../platform/enums';
import { LearnWatchKind } from '../enums';
import { ISBN13, LearnSectionKey, LearnSkillKey } from '../learn/learn.schema';

/** Scalable earning-posture row (backoffice.reference_growth_income_posture). */
export const IncomePosture = CatalogItemBase.extend({
    description: z.string().max(280).nullable(),
});

/**
 * Scalable wealth-stage row (backoffice.reference_growth_wealth_stage).
 * sortOrder drives progression; optional net-worth floor in minor units for later auto-detect.
 */
export const WealthStage = CatalogItemBase.extend({
    description: z.string().max(280).nullable(),
    /** Optional display badge (e.g. milestone label) — not a legal/status claim. */
    badgeLabel: z.string().max(64).nullable(),
    /** Net worth floor in eurocents; null = no automatic threshold yet. */
    minNetWorth: Money.nullable(),
});

/**
 * Backoffice catalog row: growth lever / method suggestion.
 * Audience tags use catalog keys so postures/stages can grow without code deploys.
 */
export const GrowthLeverPreset = CatalogItemBase.extend({
    description: z.string().min(1).max(280),
    accentColor: z.string().min(1).max(64),
    /** Empty = relevant for every posture. Keys → IncomePosture.key */
    postureKeys: z.array(z.string().min(1).max(64)),
    /** Empty = relevant for every spending style. */
    spendingStyles: z.array(z.enum(SpendingStyle)),
    /** Lowest wealth stage key that should see this lever. */
    minWealthStageKey: z.string().min(1).max(64),
    /** WealthStage.sortOrder of that stage, for client-side filtering. */
    minWealthStageSortOrder: z.int(),
});

/**
 * Rumtelo-owned book we recommend. We store the pointer (author, cover, link),
 * not the work. minPlan hides a title the household's tier cannot see.
 * spendingStyles empty = relevant to every style; otherwise it is a suggestion.
 */
export const LearnBookPreset = CatalogItemBase.extend({
    description: z.string().min(1).max(280),
    author: z.string().min(1).max(120),
    /** Money, communication, marketing, or leadership. A key, so the list can grow. */
    skill: LearnSkillKey,
    /** Learning section key. Same idea as a category key — the list can grow. */
    topic: LearnSectionKey,
    minPlan: z.enum(PlanKey),
    /** Empty = not tied to saver / spender. */
    spendingStyles: z.array(z.enum(SpendingStyle)),
    /** Open Library cover id. Null when the catalog has no image. */
    coverId: z.number().int().positive().nullable(),
    /** ISBN-13 of the edition to buy. Null = no store link, only the author pointer. */
    isbn13: z.string().regex(ISBN13).nullable(),
    url: z.string().url().max(280),
});

/**
 * A film, YouTube video, or series we recommend. Same gates as a book:
 * minPlan hides it, spendingStyles only suggests it. We store the pointer.
 */
export const LearnWatchPreset = CatalogItemBase.extend({
    description: z.string().min(1).max(280),
    creator: z.string().min(1).max(120),
    /** Money, communication, marketing, or leadership. A key, so the list can grow. */
    skill: LearnSkillKey,
    /** Learning section key. Same idea as a category key — the list can grow. */
    topic: LearnSectionKey,
    minPlan: z.enum(PlanKey),
    spendingStyles: z.array(z.enum(SpendingStyle)),
    format: z.enum(LearnWatchKind),
    /** YouTube id for the poster. Null when the pointer is a page, not a video. */
    youtubeId: z.string().min(8).max(16).nullable(),
    /** Trailer, talk, or the maker's own page. */
    url: z.string().url().max(280),
    /** Where to stream or rent it (JustWatch title page). Null = url is the only pointer. */
    watchUrl: z.string().url().max(280).nullable(),
});

// Inferred types (same-module merge for consumers)
export type IncomePosture = z.infer<typeof IncomePosture>;
export type WealthStage = z.infer<typeof WealthStage>;
export type GrowthLeverPreset = z.infer<typeof GrowthLeverPreset>;
export type LearnBookPreset = z.infer<typeof LearnBookPreset>;
export type LearnWatchPreset = z.infer<typeof LearnWatchPreset>;
