import { Migration } from '@mikro-orm/migrations';

/**
 * Coach messages get a producer key (so dismissals stick) and an optional
 * person so a tip about one member's sleep does not land in their partner's inbox.
 */
export class Migration20260920150000_CoachMessageKeyAccount extends Migration {
    override async up(): Promise<void> {
        this.addSql(`alter table "platform_coach_message" add column "key" varchar(80) null;`);
        this.addSql(`alter table "platform_coach_message" add column "account_id" uuid null;`);
        this.addSql(
            `create index "platform_coach_message_household_id_account_id_key_index" on "platform_coach_message" ("household_id", "account_id", "key");`
        );
        this.addSql(
            `create unique index "platform_coach_message_household_account_key_unique" on "platform_coach_message" ("household_id", "account_id", "key") where "account_id" is not null and "key" is not null;`
        );
        this.addSql(
            `create unique index "platform_coach_message_household_key_unique" on "platform_coach_message" ("household_id", "key") where "account_id" is null and "key" is not null;`
        );
        this.addSql(
            `alter table "platform_coach_message" add constraint "platform_coach_message_account_id_foreign" foreign key ("account_id") references "auth"."account" ("id") on update cascade on delete cascade;`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `alter table "platform_coach_message" drop constraint "platform_coach_message_account_id_foreign";`
        );
        this.addSql(`drop index "platform_coach_message_household_key_unique";`);
        this.addSql(`drop index "platform_coach_message_household_account_key_unique";`);
        this.addSql(`drop index "platform_coach_message_household_id_account_id_key_index";`);
        this.addSql(`alter table "platform_coach_message" drop column "account_id";`);
        this.addSql(`alter table "platform_coach_message" drop column "key";`);
    }
}
