/**
 * Calendar Feed Contract (Growth · Koers)
 * Per-person settings for the ICS mirror, mounted at `contract.growth.course.feed`.
 * The feed itself is served at `GET /calendar/:token.ics` (no session, secret token).
 */

import { oc } from '@orpc/contract';

import { HouseholdScoped } from '../../../../common/common.schema';
import { CourseFeedSettings, CourseFeedUpdateInput } from './feed.schema';

// ====================================================================
// ? READ Operations
// ====================================================================

/** The viewer's feed settings and, when on, their secret address. */
export const courseFeedGet = oc.input(HouseholdScoped).output(CourseFeedSettings);

// ====================================================================
// ? UPDATE Operations
// ====================================================================

/** Switch the feed on (creates the address on first use). */
export const courseFeedEnable = oc.input(HouseholdScoped).output(CourseFeedSettings);

/** Which sources show, and the month-close lead. */
export const courseFeedUpdate = oc.input(CourseFeedUpdateInput).output(CourseFeedSettings);

/** New address; the old one stops working at once. */
export const courseFeedRotate = oc.input(HouseholdScoped).output(CourseFeedSettings);

// ====================================================================
// ? DELETE Operations
// ====================================================================

/** Switch the feed off; the address stops working. Settings are kept. */
export const courseFeedDisable = oc.input(HouseholdScoped).output(CourseFeedSettings);

/** Nested contract object mounted at `contract.growth.course.feed`. */
export const courseFeedContract = {
    get: courseFeedGet,
    enable: courseFeedEnable,
    update: courseFeedUpdate,
    rotate: courseFeedRotate,
    disable: courseFeedDisable,
};
