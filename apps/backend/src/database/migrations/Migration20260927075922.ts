import { Migration } from '@mikro-orm/migrations';

/**
 * PracticeClientLink dual-consent: householdAcceptedAt records when the
 * household OWNER/ADMIN accepted the Practice offer (createdAt = practice side).
 */
export class Migration20260927075922 extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter table "public"."platform_practice_client_link" add column "household_accepted_at" timestamptz null;`
        );
        // Existing ACTIVE rows were activated without an explicit accept timestamp —
        // backfill from activated_at (or created_at) so dual-consent reads stay honest.
        this.addSql(`
            update "public"."platform_practice_client_link"
            set "household_accepted_at" = coalesce("activated_at", "created_at")
            where "status" = 'ACTIVE' and "household_accepted_at" is null;
        `);
    }

    override async down(): Promise<void> {
        this.addSql(
            `alter table "public"."platform_practice_client_link" drop column "household_accepted_at";`
        );
    }
}
