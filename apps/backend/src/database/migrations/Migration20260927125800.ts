import { Migration } from '@mikro-orm/migrations';

/**
 * PracticeClientInvite — email-token invites for clients without a household yet.
 */
export class Migration20260927125800 extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create type "platform_practice_client_invite_status" as enum ('PENDING', 'ACCEPTED', 'REVOKED');
        `);
        this.addSql(`
            create table "public"."platform_practice_client_invite" (
                "id" uuid not null,
                "created_at" timestamptz not null,
                "updated_at" timestamptz not null,
                "email" text not null,
                "token" text not null,
                "expires_at" timestamptz not null,
                "accepted_link_id" uuid null,
                "status" "platform_practice_client_invite_status" not null default 'PENDING',
                "access" "platform_practice_client_access" not null default 'VIEW',
                "practice_id" uuid not null,
                "added_by_account_id" uuid null,
                constraint "platform_practice_client_invite_pkey" primary key ("id")
            );
        `);
        this.addSql(`
            alter table "public"."platform_practice_client_invite"
                add constraint "platform_practice_client_invite_token_unique" unique ("token");
        `);
        this.addSql(`
            create index "platform_practice_client_invite_practice_id_email_index"
                on "public"."platform_practice_client_invite" ("practice_id", "email");
        `);
        this.addSql(`
            alter table "public"."platform_practice_client_invite"
                add constraint "platform_practice_client_invite_practice_id_foreign"
                foreign key ("practice_id") references "public"."platform_practice" ("id")
                on update cascade on delete cascade;
        `);
        this.addSql(`
            alter table "public"."platform_practice_client_invite"
                add constraint "platform_practice_client_invite_added_by_account_id_foreign"
                foreign key ("added_by_account_id") references "auth"."account" ("id")
                on update cascade on delete set null;
        `);
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "public"."platform_practice_client_invite" cascade;`);
        this.addSql(`drop type if exists "platform_practice_client_invite_status";`);
    }
}
