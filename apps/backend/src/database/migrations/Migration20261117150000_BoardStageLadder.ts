import { Migration } from '@mikro-orm/migrations';

/**
 * Clarity 3 / progressive unlock ladder.
 * - `auth.household_settings.board_stage_floor` (`platform_board_stage`: SPLIT / SORTING /
 *   ROUTINE / MONTH, nullable): the lowest board stage a household shows. Server-written only.
 *   Every household that exists when this runs is set to MONTH, so the update never hides a
 *   surface a household already uses; households created afterwards start with null and walk
 *   the ladder. The backfill only touches rows that are still null, so a re-run is harmless.
 * - `auth.account_settings.is_showing_all_surfaces` (boolean, default false): a person's "Show
 *   everything now" switch. Existing people stay on false.
 * Hand-written (no database at hand to introspect); verify with db:gen.
 */
export class Migration20261117150000_BoardStageLadder extends Migration {

  override name = 'Migration20261117150000_BoardStageLadder';

  override up(): void | Promise<void> {
    this.addSql(`create type "platform_board_stage" as enum ('SPLIT', 'SORTING', 'ROUTINE', 'MONTH');`);

    this.addSql(`alter table "auth"."household_settings" add column "board_stage_floor" "public"."platform_board_stage" null;`);
    this.addSql(`update "auth"."household_settings" set "board_stage_floor" = 'MONTH' where "board_stage_floor" is null;`);

    this.addSql(`alter table "auth"."account_settings" add column "is_showing_all_surfaces" boolean not null default false;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "auth"."account_settings" drop column "is_showing_all_surfaces";`);

    this.addSql(`alter table "auth"."household_settings" drop column "board_stage_floor";`);

    this.addSql(`drop type "platform_board_stage";`);
  }

}
