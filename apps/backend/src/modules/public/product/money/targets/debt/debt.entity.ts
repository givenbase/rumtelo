import { Entity, Enum, Property } from '@mikro-orm/core';
import { Cadence, DebtKind, DebtScheduleKind } from '@rumtelo/contracts';

import { HouseholdEntity } from '../../../../../../common/database/household.entity';
import { NativeEnum } from '../../../../../../common/database/native-enum.util';
import { entityConfig } from '../../../../../../common/database/entity-config.util';

/**
 * Debt Entity
 *
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'public', domain: 'money', tableName: 'debt' }))
export class Debt extends HouseholdEntity {
    // ? PROPERTIES
    @Property({ length: 120 })
    name!: string;

    @Property({ type: 'bigint' })
    balance!: number;

    @Property({ type: 'bigint' })
    originalBalance!: number;

    /** APR as decimal, e.g. 12.90 — it drives projections, so never a float. */
    @Property({ type: 'decimal', precision: 5, scale: 2, defaultRaw: '0.00' })
    interestRate!: string;

    @Property({ type: 'bigint', default: 0 })
    minimumPayment = 0;

    @Property({ type: 'bigint', default: 0 })
    extraPayment = 0;

    @Property({ nullable: true })
    dueDay: number | null = null;

    @Property({ nullable: true })
    termPayments: number | null = null;

    @Property({ type: 'date', nullable: true })
    closedOn: string | null = null;

    @Property({ type: 'date', nullable: true })
    maturityOn: string | null = null;

    @Property({ type: 'date', nullable: true })
    startedOn: string | null = null;

    // ? ENUMS
    @Enum(NativeEnum({ DebtKind, domain: 'money', defaultValue: DebtKind.LOAN }))
    kind: DebtKind = DebtKind.LOAN;

    @Enum(
        NativeEnum({
            DebtScheduleKind,
            domain: 'money',
            defaultValue: DebtScheduleKind.OPEN,
        })
    )
    scheduleKind: DebtScheduleKind = DebtScheduleKind.OPEN;

    @Enum(NativeEnum({ Cadence, domain: 'money', defaultValue: Cadence.MONTHLY }))
    paymentCadence: Cadence = Cadence.MONTHLY;
}
