import { Migration } from '@mikro-orm/migrations';

/**
 * US spelling: capability key soul-centres → soul-centers (and matching plan_feature key).
 * Grants reference capability by id — no grant column rewrite needed.
 */
export class Migration20260928123000_UsSpellingSoulCenters extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `update "backoffice"."plan_capability"
             set "key" = 'soul-centers',
                 "name" = 'Centers',
                 "description" = 'The seven centers and where energy gets stuck.'
             where "key" = 'soul-centres';`
        );
        this.addSql(
            `update "backoffice"."plan_feature" f
             set "key" = 'centers',
                 "name" = 'Centers',
                 "description" = 'The seven centers and where energy gets stuck.'
             from "backoffice"."plan_product" p
             where f."product_id" = p."id"
               and p."key" = 'soul'
               and f."key" = 'centres';`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `update "backoffice"."plan_capability"
             set "key" = 'soul-centres',
                 "name" = 'Centres',
                 "description" = 'The seven centres and where energy gets stuck.'
             where "key" = 'soul-centers';`
        );
        this.addSql(
            `update "backoffice"."plan_feature" f
             set "key" = 'centres',
                 "name" = 'Centres',
                 "description" = 'The seven centres and where energy gets stuck.'
             from "backoffice"."plan_product" p
             where f."product_id" = p."id"
               and p."key" = 'soul'
               and f."key" = 'centers';`
        );
    }
}
