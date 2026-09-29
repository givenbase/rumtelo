import { Entity, PrimaryKey, Property, Unique } from '@mikro-orm/decorators/legacy';

/**
 * better-auth organization plugin table, stored as `auth.household`.
 *
 * The plugin API still says "organization"; we map `modelName: 'household'`
 * so the database and our code speak Rumtelo. Finance settings hang off this
 * id in `auth.household_settings`.
 *
 *   id    = householdId (Postgres uuid — BA `generateId` → uuidv7)
 *   slug  = unique human-readable handle (not used for API scoping)
 *   name  = display label for the household
 *
 * @see https://www.better-auth.com/docs/plugins/organization#customizing-the-schema
 */
@Entity({ tableName: 'household', schema: 'auth' })
@Unique({ properties: ['slug'] })
export class AuthHousehold {
    @PrimaryKey({ type: 'uuid' })
    id!: string;

    @Property({ type: 'text' })
    name!: string;

    @Property({ type: 'text' })
    slug!: string;

    @Property({ type: 'text', nullable: true })
    logo?: string;

    @Property({ type: 'timestamptz' })
    createdAt!: Date;

    @Property({ type: 'text', nullable: true })
    metadata?: string;
}
