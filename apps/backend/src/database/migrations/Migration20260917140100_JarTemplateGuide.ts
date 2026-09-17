import { Migration } from '@mikro-orm/migrations';

/** Coach guide copy for each jar template (allowed / not-allowed / links). */
export class Migration20260917140100_JarTemplateGuide extends Migration {
    override async up(): Promise<void> {
        // Prefer guide_payload; older local DBs may still have "guide" from an early draft.
        this.addSql(
            `alter table "backoffice"."reference_money_jar_template" add column if not exists "guide_payload" jsonb null;`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `alter table "backoffice"."reference_money_jar_template" drop column if exists "guide_payload";`
        );
    }
}
