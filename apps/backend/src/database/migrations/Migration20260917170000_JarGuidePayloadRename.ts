import { Migration } from '@mikro-orm/migrations';

/** Rename jar guide JSON column to guide_payload (entity style). */
export class Migration20260917170000_JarGuidePayloadRename extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            do $$ begin
                if exists (
                    select 1 from information_schema.columns
                    where table_schema = 'backoffice'
                      and table_name = 'reference_money_jar_template'
                      and column_name = 'guide'
                ) and not exists (
                    select 1 from information_schema.columns
                    where table_schema = 'backoffice'
                      and table_name = 'reference_money_jar_template'
                      and column_name = 'guide_payload'
                ) then
                    alter table "backoffice"."reference_money_jar_template"
                    rename column "guide" to "guide_payload";
                elsif not exists (
                    select 1 from information_schema.columns
                    where table_schema = 'backoffice'
                      and table_name = 'reference_money_jar_template'
                      and column_name = 'guide_payload'
                ) then
                    alter table "backoffice"."reference_money_jar_template"
                    add column "guide_payload" jsonb null;
                end if;
            end $$;
        `);
        this.addSql(
            `alter table "backoffice"."reference_money_jar_template" drop column if exists "guide";`
        );
    }

    override async down(): Promise<void> {
        this.addSql(`
            do $$ begin
                if exists (
                    select 1 from information_schema.columns
                    where table_schema = 'backoffice'
                      and table_name = 'reference_money_jar_template'
                      and column_name = 'guide_payload'
                ) and not exists (
                    select 1 from information_schema.columns
                    where table_schema = 'backoffice'
                      and table_name = 'reference_money_jar_template'
                      and column_name = 'guide'
                ) then
                    alter table "backoffice"."reference_money_jar_template"
                    rename column "guide_payload" to "guide";
                end if;
            end $$;
        `);
    }
}
