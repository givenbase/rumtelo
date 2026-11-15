import { Migration } from '@mikro-orm/migrations';

/**
 * Koers (Course) soft limits and scope.
 * - Year, quarter and month no longer cap at 3 per parent: the unique goal slot index goes
 *   and `position` becomes plain ordering (checked 0–999).
 * - Week and day keep their unique period slot, now up to 5 (3 stays the recommendation).
 * - New nullable `scope` (PERSONAL / BUSINESS) on `growth_course_item`.
 * Hand-written (no database at hand to introspect). `down` fails by design while any slot
 * holds more than 3 items or a week / day item sits on position 4–5: it never deletes rows.
 */
export class Migration20261115120000_CourseSoftLimits extends Migration {

  override name = 'Migration20261115120000_CourseSoftLimits';

  override up(): void | Promise<void> {
    this.addSql(`create type "growth_course_scope" as enum ('PERSONAL', 'BUSINESS');`);
    this.addSql(`alter table "growth_course_item" add column "scope" "public"."growth_course_scope" null;`);

    this.addSql(`drop index "growth_course_item_goal_slot_unique";`);

    this.addSql(`alter table "growth_course_item" drop constraint "growth_course_item_position_range";`);
    this.addSql(`alter table "growth_course_item" add constraint "growth_course_item_position_range" check ((position BETWEEN 0 AND 999) AND (position <= 5 OR horizon IN ('YEAR', 'QUARTER', 'MONTH')));`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "growth_course_item" drop constraint "growth_course_item_position_range";`);
    this.addSql(`alter table "growth_course_item" add constraint "growth_course_item_position_range" check ((position BETWEEN 0 AND 3));`);

    this.addSql(`create unique index "growth_course_item_goal_slot_unique" on "public"."growth_course_item" ("household_id", "account_id", "horizon", "period", "parent_id", "position") nulls not distinct where "horizon" in ('YEAR', 'QUARTER', 'MONTH');`);

    this.addSql(`alter table "growth_course_item" drop column "scope";`);
    this.addSql(`drop type "growth_course_scope";`);
  }

}
