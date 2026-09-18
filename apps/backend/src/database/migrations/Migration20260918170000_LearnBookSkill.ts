import { Migration } from '@mikro-orm/migrations';

/** A book can belong to money, communication, or marketing without a new enum. */
export class Migration20260918170000_LearnBookSkill extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter table "backoffice"."reference_growth_book_preset" add column "skill" varchar(64) not null default 'MONEY';`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `alter table "backoffice"."reference_growth_book_preset" drop column "skill";`
        );
    }
}
