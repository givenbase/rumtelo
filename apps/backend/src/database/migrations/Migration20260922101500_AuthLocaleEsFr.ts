import { Migration } from '@mikro-orm/migrations';

/**
 * Extend auth_locale for Spanish + French account / UI locales.
 */
export class Migration20260922101500_AuthLocaleEsFr extends Migration {
    override async up(): Promise<void> {
        this.addSql(`ALTER TYPE "public"."auth_locale" ADD VALUE IF NOT EXISTS 'ES';`);
        this.addSql(`ALTER TYPE "public"."auth_locale" ADD VALUE IF NOT EXISTS 'FR';`);
    }

    override async down(): Promise<void> {
        // Postgres cannot drop enum values safely — no-op.
    }
}
