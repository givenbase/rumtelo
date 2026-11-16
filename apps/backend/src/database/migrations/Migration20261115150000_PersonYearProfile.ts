import { Migration } from '@mikro-orm/migrations';

/**
 * "Plan your year" intake: two optional person answers on `auth.account_settings`.
 * - `work_situation` (EMPLOYED / SELF_EMPLOYED / BOTH / STUDENT / SEEKING) orders goal presets.
 * - `year_intention` (CALM / GROW / BUILD / RECOVER) sets the tone of the intake.
 * Both nullable, no default: existing rows stay "not told". Native enum types live in `public`.
 * Hand-written (no database at hand to introspect); verify with db:gen.
 */
export class Migration20261115150000_PersonYearProfile extends Migration {

  override name = 'Migration20261115150000_PersonYearProfile';

  override up(): void | Promise<void> {
    this.addSql(`create type "auth_work_situation" as enum ('EMPLOYED', 'SELF_EMPLOYED', 'BOTH', 'STUDENT', 'SEEKING');`);
    this.addSql(`create type "auth_year_intention" as enum ('CALM', 'GROW', 'BUILD', 'RECOVER');`);

    this.addSql(`alter table "auth"."account_settings" add column "work_situation" "public"."auth_work_situation" null;`);
    this.addSql(`alter table "auth"."account_settings" add column "year_intention" "public"."auth_year_intention" null;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "auth"."account_settings" drop column "year_intention";`);
    this.addSql(`alter table "auth"."account_settings" drop column "work_situation";`);

    this.addSql(`drop type "auth_year_intention";`);
    this.addSql(`drop type "auth_work_situation";`);
  }

}
