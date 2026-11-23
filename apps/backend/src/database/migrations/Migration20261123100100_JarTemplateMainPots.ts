import { Migration } from '@mikro-orm/migrations';

/**
 * Rumtelo Pots: the jar template catalog moves to three main pots plus optional ones.
 *
 * Seeders do not run on deploy (db-migrate.yml runs `db:push` + `auth:migrate` only), so the
 * catalog rows that `JarTemplateSeeder` / `CatalogTranslationSeeder` / `CategoryTemplateSeeder`
 * would write are written here, mirroring `jar.seed-data.ts`, `jar-translations.ts` and
 * `category.seed-data.ts`. Every statement is idempotent so a later seeder run agrees with it.
 *
 * 1. `is_default` (boolean, not null, default false) on the template table.
 * 2. NECESSITIES / LONG_TERM_SAVINGS / PLAY become the default pots at 55 / 20 / 25; the optional
 *    pots carry the share they take from their group's main pot (FINANCIAL_FREEDOM, EDUCATION,
 *    GIVE 5 each). Rows are reordered in group order. The LONG_TERM_SAVINGS icon moves to 🛟
 *    (🎯 goes to GOALS) only where it still holds the seeded 🎯.
 * 3. DAILY and GOALS template rows (needs the enum values committed by
 *    `Migration20261123100000_JarKeyDailyGoals`).
 * 4. nl / es / fr name + subtitle translations for the two new templates.
 * 5. Category links: everyday categories also offered on DAILY, named-goal categories on GOALS,
 *    OTHER on both. Appended after the existing links so the primary (first) jar is unchanged.
 *
 * Household data is not touched: existing households keep their own six `money_jar` rows.
 * Hand-written (no database at hand to introspect); unverified until it runs on staging.
 */
export class Migration20261123100100_JarTemplateMainPots extends Migration {
    override name = 'Migration20261123100100_JarTemplateMainPots';

    override up(): void | Promise<void> {
        this.addSql(
            `alter table "backoffice"."reference_money_jar_template" add column "is_default" boolean not null default false;`
        );

        this.addSql(`
            update "backoffice"."reference_money_jar_template" as template
            set "is_default" = seed."is_default",
                "percentage" = seed."percentage",
                "sort_order" = seed."sort_order",
                "updated_at" = now()
            from (values
                ('NECESSITIES', true, 55.00, 0),
                ('LONG_TERM_SAVINGS', true, 20.00, 2),
                ('FINANCIAL_FREEDOM', false, 5.00, 4),
                ('EDUCATION', false, 5.00, 5),
                ('PLAY', true, 25.00, 6),
                ('GIVE', false, 5.00, 7)
            ) as seed ("key", "is_default", "percentage", "sort_order")
            where template."key"::text = seed."key";
        `);
        this.addSql(`
            update "backoffice"."reference_money_jar_template"
            set "icon" = '🛟', "updated_at" = now()
            where "key" = 'LONG_TERM_SAVINGS' and "icon" = '🎯';
        `);

        this.addSql(`
            insert into "backoffice"."reference_money_jar_template"
                ("id", "created_at", "updated_at", "name", "subtitle", "icon", "percentage", "sort_order", "guide", "capabilities", "is_active", "is_default", "key")
            values
                (
                    gen_random_uuid(), now(), now(),
                    'Daily', 'Groceries and getting around', '🛒', 20.00, 1,
                    '{"note":"Everyday spending, split off Necessity so bills and the weekly shop stop hiding in one pot. Its share comes out of Necessity.","allowed":[{"label":"Groceries","icon":"🛒"},{"label":"Drugstore & pharmacy","icon":"🧴"},{"label":"Household supplies","icon":"🧹"},{"label":"Transport & fuel","icon":"🚗"}],"notAllowed":"No bills here — rent, energy and insurance stay in Necessity.","links":[{"href":"/product/money/transactions","label":"Transactions","icon":"↔"}]}'::jsonb,
                    '{"canSpend":true,"canSave":false,"canInvest":false,"countsTowardSafeToSpend":true,"allowsFixedCosts":false}'::jsonb,
                    true, false, 'DAILY'
                ),
                (
                    gen_random_uuid(), now(), now(),
                    'Goals', 'What you save for', '🎯', 6.00, 3,
                    '{"note":"Named goals with a date: a car, a deposit, a renovation. Its share comes out of Long Term Savings, which stays your buffer.","allowed":[{"label":"Car or big purchase","icon":"🚗"},{"label":"Down payment","icon":"🏡"},{"label":"Renovation","icon":"🔨"},{"label":"A planned trip","icon":"🧳"}],"notAllowed":"Not the emergency fund — that buffer stays in Long Term Savings.","links":[{"href":"/product/growth/goals","label":"Goals","icon":"🎯"},{"href":"/product/money/transactions","label":"Transactions","icon":"↔"}]}'::jsonb,
                    '{"canSpend":true,"canSave":true,"canInvest":false,"countsTowardSafeToSpend":false,"allowsFixedCosts":false}'::jsonb,
                    true, false, 'GOALS'
                )
            on conflict ("key") do nothing;
        `);

        this.addSql(`
            insert into "backoffice"."reference_translation"
                ("id", "created_at", "updated_at", "entity_type", "entity_key", "field_name", "locale", "text")
            select gen_random_uuid(), now(), now(), 'jar_template', copy."entity_key", copy."field_name", copy."locale", copy."text"
            from (values
                ('DAILY', 'name', 'nl', 'Dagelijks'),
                ('DAILY', 'subtitle', 'nl', 'Boodschappen en onderweg'),
                ('GOALS', 'name', 'nl', 'Doelen'),
                ('GOALS', 'subtitle', 'nl', 'Waar je voor spaart'),
                ('DAILY', 'name', 'es', 'Diario'),
                ('DAILY', 'subtitle', 'es', 'Compras y desplazamientos'),
                ('GOALS', 'name', 'es', 'Metas'),
                ('GOALS', 'subtitle', 'es', 'Para lo que ahorras'),
                ('DAILY', 'name', 'fr', 'Quotidien'),
                ('DAILY', 'subtitle', 'fr', 'Courses et déplacements'),
                ('GOALS', 'name', 'fr', 'Objectifs'),
                ('GOALS', 'subtitle', 'fr', 'Ce pour quoi tu épargnes')
            ) as copy ("entity_key", "field_name", "locale", "text")
            on conflict ("entity_type", "entity_key", "field_name", "locale") do nothing;
        `);

        // The pivot lost its unique index in Migration20261013113038, so guard with not exists.
        // Ordered by category sort order so the serial ids follow the seed like the seeder does.
        this.addSql(`
            insert into "backoffice"."reference_money_category_template_jar_template"
                ("category_template_id", "jar_template_id")
            select category."id", jar."id"
            from (values
                ('GROCERIES', 'DAILY'),
                ('TRANSPORT', 'DAILY'),
                ('PHARMACY', 'DAILY'),
                ('DRUGSTORE', 'DAILY'),
                ('CLEANING', 'DAILY'),
                ('OTHER', 'DAILY'),
                ('OTHER', 'GOALS'),
                ('BIG_PURCHASES', 'GOALS'),
                ('HOME_DEPOSIT', 'GOALS')
            ) as link ("category_key", "jar_key")
            join "backoffice"."reference_money_category_template" as category
                on category."key" = link."category_key"
            join "backoffice"."reference_money_jar_template" as jar
                on jar."key"::text = link."jar_key"
            where not exists (
                select 1
                from "backoffice"."reference_money_category_template_jar_template" as existing
                where existing."category_template_id" = category."id"
                    and existing."jar_template_id" = jar."id"
            )
            order by category."sort_order" asc, jar."sort_order" asc;
        `);
    }

    override down(): void | Promise<void> {
        this.addSql(`
            delete from "backoffice"."reference_money_category_template_jar_template" as link
            using "backoffice"."reference_money_jar_template" as jar
            where link."jar_template_id" = jar."id" and jar."key" in ('DAILY', 'GOALS');
        `);
        this.addSql(`
            delete from "backoffice"."reference_translation"
            where "entity_type" = 'jar_template' and "entity_key" in ('DAILY', 'GOALS');
        `);
        // Keep a template row that household jars or presets already point at; dropping it
        // would orphan a pot (money_jar.key) or break a restrict FK.
        this.addSql(`
            delete from "backoffice"."reference_money_jar_template" as template
            where template."key" in ('DAILY', 'GOALS')
                and not exists (select 1 from "public"."money_jar" as jar where jar."key" = template."key")
                and not exists (select 1 from "backoffice"."reference_money_fixed_cost_preset" as preset where preset."jar_template_id" = template."id")
                and not exists (select 1 from "backoffice"."reference_money_goal_preset" as preset where preset."jar_template_id" = template."id")
                and not exists (select 1 from "backoffice"."reference_money_merchant_preset" as preset where preset."jar_template_id" = template."id");
        `);
        this.addSql(`
            update "backoffice"."reference_money_jar_template"
            set "icon" = '🎯', "updated_at" = now()
            where "key" = 'LONG_TERM_SAVINGS' and "icon" = '🛟';
        `);
        this.addSql(`
            update "backoffice"."reference_money_jar_template" as template
            set "percentage" = seed."percentage",
                "sort_order" = seed."sort_order",
                "updated_at" = now()
            from (values
                ('NECESSITIES', 55.00, 0),
                ('FINANCIAL_FREEDOM', 10.00, 1),
                ('LONG_TERM_SAVINGS', 10.00, 2),
                ('EDUCATION', 10.00, 3),
                ('PLAY', 10.00, 4),
                ('GIVE', 5.00, 5)
            ) as seed ("key", "percentage", "sort_order")
            where template."key"::text = seed."key";
        `);
        this.addSql(
            `alter table "backoffice"."reference_money_jar_template" drop column "is_default";`
        );
    }
}
