import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';
import type { Asset as AssetDto } from '@rumtelo/contracts';

import { currentHouseholdId } from '../../../../../common/household/household.context';
import { HouseholdScopedRepository } from '../../../../../common/household/household-scoped.repository';
import { Asset } from './asset.entity';

function toDto(row: Asset): AssetDto {
    return {
        id: row.id,
        householdId: row.household,
        name: row.name,
        kindKey: row.kindKey,
        presetKey: row.presetKey,
        value: row.value,
        flow: row.flow,
    };
}

@Injectable()
export class AssetService {
    private readonly assets: HouseholdScopedRepository<Asset>;

    constructor(@Inject(EntityManager) private readonly em: EntityManager) {
        this.assets = new HouseholdScopedRepository(em, Asset);
    }

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    async create(input: Omit<AssetDto, 'id'>): Promise<AssetDto> {
        const row = this.em.create(Asset, {
            household: currentHouseholdId(),
            name: input.name,
            kindKey: input.kindKey,
            presetKey: input.presetKey,
            value: input.value,
            flow: input.flow,
        } as never);
        await this.em.persist(row).flush();
        return toDto(row);
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    async list(): Promise<AssetDto[]> {
        const rows = await this.assets.find({}, { orderBy: { name: 'ASC' } });
        return rows.map(toDto);
    }

    async get(id: string): Promise<AssetDto> {
        const row = await this.assets.findOneOrFail({ id });
        return toDto(row);
    }

    // ====================================================================
    // ? UPDATE Operations
    // ====================================================================

    async update(input: AssetDto): Promise<AssetDto> {
        const row = await this.assets.findOneOrFail({ id: input.id });
        row.name = input.name;
        row.kindKey = input.kindKey;
        row.presetKey = input.presetKey;
        row.value = input.value;
        row.flow = input.flow;
        await this.em.flush();
        return toDto(row);
    }

    // ====================================================================
    // ? DELETE Operations
    // ====================================================================

    async remove(id: string): Promise<{ ok: true }> {
        const row = await this.assets.findOneOrFail({ id });
        this.assets.remove(row);
        await this.em.flush();
        return { ok: true };
    }
}
