import { Migration } from '@mikro-orm/migrations';

/**
 * Personal Mindset "direction" (north star): two optional free-text answers per person on
 * `auth.account_settings`.
 * - `direction`     where the person wants to be a year from now (max 280, enforced by the contract).
 * - `direction_why` what it is for, in their own words (max 280).
 * Both nullable, no default: existing rows stay "not written". Plain `text`, like the other
 * free-text columns (no length CHECK anywhere in this codebase; the oRPC schema caps it).
 * `account_settings` is Rumtelo's table, not better-auth's. Hand-written (no database at hand to
 * introspect); verify with db:gen.
 */
export class Migration20261124100000_AccountDirection extends Migration {

  override name = 'Migration20261124100000_AccountDirection';

  override up(): void | Promise<void> {
    this.addSql(`alter table "auth"."account_settings" add column "direction" text null;`);
    this.addSql(`alter table "auth"."account_settings" add column "direction_why" text null;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "auth"."account_settings" drop column "direction_why";`);
    this.addSql(`alter table "auth"."account_settings" drop column "direction";`);
  }

}
