import { Migration } from '@mikro-orm/migrations';

/**
 * Drop retired HouseholdKind + leftover sidecar meta from the short-lived
 * relation experiment (never on origin/dev; IF EXISTS for any local apply).
 *
 * `auth.member` / `auth.invitation.relation` stay BA-owned (`pn auth:migrate`).
 */
export class Migration20261013113145 extends Migration {
    override name = 'Migration20261013113145';

    override up(): void | Promise<void> {
        this.addSql(`alter table "auth"."household_settings" drop column if exists "kind";`);
        this.addSql(`drop type if exists "public"."platform_household_kind";`);

        this.addSql(`drop table if exists "platform_household_invite_meta" cascade;`);
        this.addSql(`drop table if exists "platform_household_member_meta" cascade;`);
        this.addSql(`drop type if exists "public"."platform_household_relation";`);
    }

    override down(): void | Promise<void> {
        this.addSql(
            `create type "public"."platform_household_kind" as enum ('FAMILY', 'PARTNERS', 'FRIENDS', 'SOLO');`
        );
        this.addSql(
            `alter table "auth"."household_settings" add "kind" "public"."platform_household_kind" not null default 'SOLO';`
        );
        // Meta sidecars intentionally not recreated — Relation lives on BA tables.
    }
}
