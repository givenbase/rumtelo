import { Migration } from '@mikro-orm/migrations';

/**
 * Clarity 2 / onboarding: a household starts with one "Main account" that has no bank
 * and no IBAN, so `money_bank_account.bank_id` becomes nullable. The catalog has no
 * "Other bank" row on purpose (a placeholder would fool the statement-import guard); the
 * household picks the real bank later in Settings.
 * The foreign key keeps `on delete restrict`; existing rows all have a bank, so nothing
 * is backfilled. `down` fails by design while any account has no bank: it never deletes
 * or invents a bank for a row.
 * Hand-written (no database at hand to introspect); verify with db:gen.
 */
export class Migration20261117100000_MainAccountNoBank extends Migration {

  override name = 'Migration20261117100000_MainAccountNoBank';

  override up(): void | Promise<void> {
    this.addSql(`alter table "money_bank_account" alter column "bank_id" drop not null;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "money_bank_account" alter column "bank_id" set not null;`);
  }

}
