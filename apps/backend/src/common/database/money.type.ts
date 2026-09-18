import { BigIntType } from '@mikro-orm/core';

/**
 * Money column type — integer minor units (eurocents) stored as Postgres `bigint`.
 *
 * MikroORM's default `BigIntType` hydrates as a native JS `BigInt`, which silently
 * contradicts a `number` TypeScript annotation and throws on the first mixed
 * arithmetic (`goal.saved + 1`). This type pins the runtime mode to `number`, so
 * `@Property({ type: MoneyType }) amount!: number` is true at runtime as well as
 * at compile time. Safe: JS integers stay exact far beyond any household budget.
 *
 * Use this for every amount / balance / target column. Percentages and rates stay
 * `decimal` strings — they are not money.
 *
 * @see common/utils/money.util.ts — arithmetic helpers
 */
export class MoneyType extends BigIntType<'number'> {
    constructor() {
        super('number');
    }
}
