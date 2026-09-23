import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';

import { Bank } from './bank.entity';

@Injectable()
export class BankService {
    constructor(@Inject(EntityManager) private readonly em: EntityManager) {}

    async listActive(opts?: { country?: string | null }): Promise<Bank[]> {
        const rows = await this.em.find(
            Bank,
            { isActive: true },
            { orderBy: { sortOrder: 'ASC' }, populate: ['partnerBanks'] }
        );
        const country = opts?.country?.trim().toUpperCase();
        if (!country) return rows;
        return rows.filter(row => row.countries.some(code => code.toUpperCase() === country));
    }

    async findById(id: string): Promise<Bank | null> {
        return this.em.findOne(Bank, { id, isActive: true });
    }

    async findByKey(key: string): Promise<Bank | null> {
        return this.em.findOne(Bank, { key, isActive: true });
    }
}
