import { Migration } from '@mikro-orm/migrations';

/**
 * A skill is a catalog key, not a closed list.
 * QUEUE / NOW / DONE stays an enum. The skill list does not.
 */
export class Migration20260918160000_LearnSkillKey extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter table "growth_learn_progress" alter column "skill" type varchar(64) using ("skill"::text);`
        );
        this.addSql(
            `alter table "growth_learn_focus" alter column "skill" type varchar(64) using ("skill"::text);`
        );
        this.addSql(`drop type "growth_learn_skill_key";`);
    }

    override async down(): Promise<void> {
        this.addSql(
            `create type "growth_learn_skill_key" as enum ('MONEY', 'COMMUNICATION', 'MARKETING');`
        );
        this.addSql(
            `alter table "growth_learn_focus" alter column "skill" type "growth_learn_skill_key" using ("skill"::"growth_learn_skill_key");`
        );
        this.addSql(
            `alter table "growth_learn_progress" alter column "skill" type "growth_learn_skill_key" using ("skill"::"growth_learn_skill_key");`
        );
    }
}
