import { Migration } from '@mikro-orm/migrations';

/** A film, series, or video can belong to a skill without a new enum. */
export class Migration20260918210000_LearnWatchSkill extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter table "backoffice"."reference_growth_watch_preset" add column "skill" varchar(64) not null default 'MONEY';`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `alter table "backoffice"."reference_growth_watch_preset" drop column "skill";`
        );
    }
}
