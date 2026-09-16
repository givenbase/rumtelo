import { Migration } from '@mikro-orm/migrations';

/**
 * New accounts start on light appearance. System / Dark remain selectable;
 * existing rows keep their stored theme.
 */
export class Migration20260916090000_AccountThemeDefaultLight extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            alter table "auth"."account_settings"
            alter column "theme" set default 'LIGHT';
        `);
    }

    override async down(): Promise<void> {
        this.addSql(`
            alter table "auth"."account_settings"
            alter column "theme" set default 'SYSTEM';
        `);
    }
}
