import { Migration } from '@mikro-orm/migrations';

/**
 * Rumtelo Pots: two new optional pots, `DAILY` (Basics) and `GOALS` (Future), on the native
 * enum `money_jar_key` (used by public.money_jar.key, backoffice.reference_money_jar_template.key
 * and backoffice.reference_money_transaction_in_preset.jar_key).
 *
 * Non-transactional on purpose. MikroORM runs every pending migration in one master
 * transaction (`allOrNothing`), and Postgres refuses to use an enum value added inside a
 * transaction until that transaction commits ("unsafe use of new value"). Running this file
 * outside the transaction commits the two values straight away, so
 * `Migration20261123100100_JarTemplateMainPots` can insert the DAILY / GOALS template rows in
 * the same `db:push`. `if not exists` keeps a retry after a failed push harmless.
 *
 * Hand-written (no database at hand to introspect); unverified until it runs on staging.
 */
export class Migration20261123100000_JarKeyDailyGoals extends Migration {
    override name = 'Migration20261123100000_JarKeyDailyGoals';

    override isTransactional(): boolean {
        return false;
    }

    override up(): void | Promise<void> {
        this.addSql(`alter type "money_jar_key" add value if not exists 'DAILY';`);
        this.addSql(`alter type "money_jar_key" add value if not exists 'GOALS';`);
    }

    override down(): void | Promise<void> {
        // Postgres cannot remove enum values safely — leave DAILY / GOALS in place. Rows that
        // use them are removed by the down() of Migration20261123100100_JarTemplateMainPots.
    }
}
