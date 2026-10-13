import { Migration } from '@mikro-orm/migrations';

export class Migration20261011183233 extends Migration {
  override name = 'Migration20261011183233';

  override up(): void | Promise<void> {
    this.addSql(
      `create type "platform_household_relation" as enum ('FAMILY', 'CIRCLE', 'EXTERNAL');`,
    );
    this.addSql(
      `create table "platform_household_invite_meta" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "invitation_id" uuid not null, "relation" "public"."platform_household_relation" not null, primary key ("id"));`,
    );
    this.addSql(
      `create index "platform_household_invite_meta_household_id_index" on "platform_household_invite_meta" ("household_id");`,
    );
    this.addSql(
      `alter table "platform_household_invite_meta" add constraint "platform_household_invite_meta_invitation_id_unique" unique ("invitation_id");`,
    );

    this.addSql(
      `create table "platform_household_member_meta" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "user_id" uuid not null, "relation" "public"."platform_household_relation" not null, primary key ("id"));`,
    );
    this.addSql(
      `create index "platform_household_member_meta_household_id_index" on "platform_household_member_meta" ("household_id");`,
    );
    this.addSql(
      `alter table "platform_household_member_meta" add constraint "platform_household_member_meta_household_id_user_id_unique" unique ("household_id", "user_id");`,
    );

    this.addSql(
      `alter table "platform_household_invite_meta" add constraint "platform_household_invite_meta_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on delete cascade;`,
    );
    this.addSql(
      `alter table "platform_household_member_meta" add constraint "platform_household_member_meta_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on delete cascade;`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "platform_household_invite_meta" cascade;`);
    this.addSql(`drop table if exists "platform_household_member_meta" cascade;`);
    this.addSql(`drop type "platform_household_relation";`);
  }
}
