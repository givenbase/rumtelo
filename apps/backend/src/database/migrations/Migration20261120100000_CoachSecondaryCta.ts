import { Migration } from '@mikro-orm/migrations';

/**
 * Coach redesign / second move on a tip.
 * - `public.platform_coach_message.cta_secondary_label` (varchar 60, nullable) and
 *   `cta_secondary_href` (varchar 200, nullable): an optional second action next to the
 *   first one. Both stay null on every existing row and on most tips; only fixed costs
 *   over the Necessities split set them ("Add income" first, "Open the biggest fixed cost" second).
 * Additive and nullable, so no backfill and `down` loses nothing but those two columns.
 * Hand-written (no database at hand to introspect); verify with db:gen.
 */
export class Migration20261120100000_CoachSecondaryCta extends Migration {

  override name = 'Migration20261120100000_CoachSecondaryCta';

  override up(): void | Promise<void> {
    this.addSql(`alter table "platform_coach_message" add column "cta_secondary_label" varchar(60) null, add column "cta_secondary_href" varchar(200) null;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "platform_coach_message" drop column "cta_secondary_label", drop column "cta_secondary_href";`);
  }

}
