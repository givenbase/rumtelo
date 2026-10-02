import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';

import type {
    Party as PartyDto,
    PartySuggestResult,
    PartyUsage,
    PartyWithUsage,
} from '@rumtelo/contracts';
import { MerchantSuggestionStatus } from '@rumtelo/contracts';

import {
    apiBadRequest,
    apiConflict,
    apiNotFound,
} from '../../../../../../common/errors/api-user-error';
import { HouseholdScopedRepository } from '../../../../../../common/household/household-scoped.repository';
import { currentHouseholdId } from '../../../../../../common/household/household.context';
import { MerchantSuggestion } from '../../../../../backoffice/product/money/preset/merchant-suggestion/merchant-suggestion.entity';
import { MerchantBranding } from '../../../../../backoffice/product/money/preset/merchant/merchant-branding.entity';
import { MerchantMatching } from '../../../../../backoffice/product/money/preset/merchant/merchant-matching.entity';
import { MerchantPreset } from '../../../../../backoffice/product/money/preset/merchant/merchant.entity';
import { CategoryTemplate } from '../../../../../backoffice/product/money/template/category/category.entity';
import { Transaction } from '../../ledger/transaction/transaction.entity';
import { Debt } from '../../targets/debt/debt.entity';
import { FixedCost } from '../fixed-cost/fixed-cost.entity';
import { IncomeSource } from '../income/income-source.entity';
import { PartySuggestion } from './party-suggestion.entity';
import { Party } from './party.entity';

/**
 * The "other side" triple every money row carries. `party` is the uuid
 * (`mapToPk`), exposed on the wire as `partyId`.
 */
export type CounterpartyColumns = {
    counterparty: string | null;
    merchantKey: string | null;
    party: string | null;
};

/** Wire-side patch for the triple (+ the save-for-next-time flag). */
export type CounterpartyPatch = {
    counterparty?: string | null;
    merchantKey?: string | null;
    partyId?: string | null;
    saveParty?: boolean;
};

type PartyLinkedEntity = { new (): { counterparty: string | null; party: string | null } } & {
    name: string;
};

/**
 * Every entity that links to a party. Rename / merge fan out here and usage is
 * counted here — add a row when a new aggregate gets the triple.
 */
const PARTY_LINKS: ReadonlyArray<{ entity: PartyLinkedEntity; usage: keyof PartyUsage }> = [
    { entity: IncomeSource, usage: 'incomeSources' },
    { entity: FixedCost, usage: 'fixedCosts' },
    { entity: Transaction, usage: 'transactions' },
    { entity: Debt, usage: 'debts' },
];

const EMPTY_USAGE: PartyUsage = { incomeSources: 0, fixedCosts: 0, transactions: 0, debts: 0 };

function escapeLike(value: string): string {
    return value.replaceAll(/[\\%_]/g, char => `\\${char}`);
}

function normalizeName(value: string): string {
    return value.trim().replaceAll(/\s+/g, ' ');
}

/** Case-fold + collapse for suggestion aggregation. */
function normalizeSuggestionKey(value: string): string {
    return normalizeName(value).toLowerCase();
}

/** Catalog key from a display name (ACME BV → ACME_BV). */
function catalogKeyFromName(name: string): string {
    const base = name
        .normalize('NFKD')
        .replaceAll(/[^\w\s-]/g, '')
        .trim()
        .toUpperCase()
        .replaceAll(/[\s-]+/g, '_')
        .slice(0, 60);
    return base || 'MERCHANT';
}

@Injectable()
export class PartyService {
    private readonly parties: HouseholdScopedRepository<Party>;

    constructor(@Inject(EntityManager) private readonly em: EntityManager) {
        this.parties = new HouseholdScopedRepository(em, Party);
    }

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    async create(input: Omit<PartyDto, 'id' | 'householdId'>) {
        const name = normalizeName(input.name);
        if (!name) throw apiBadRequest('party_name_taken');
        if (await this.findByName(name)) throw apiConflict('party_name_taken');
        const party = this.parties.create({
            name,
            note: input.note ?? null,
            aliases: input.aliases ?? [],
            merchantKey: input.merchantKey ?? null,
            color: input.color ?? null,
            icon: input.icon ?? null,
            logoDomain: input.logoDomain ?? null,
            website: input.website ?? null,
        });
        await this.em.persist(party).flush();
        return this.toDto(party);
    }

    /** Case-insensitive lookup by name; creates when missing. Used by "save for next time". */
    async findOrCreate(rawName: string): Promise<Party> {
        const name = normalizeName(rawName);
        const existing = await this.findByName(name);
        if (existing) return existing;
        const party = this.parties.create({ name } as never);
        await this.em.persist(party).flush();
        return party;
    }

    /**
     * Applies the shared counterparty rules to a row patch and returns the columns
     * to store. Works for create (no `current`) and update (partial patch):
     *
     * - `merchantKey` and `partyId` never coexist (`party_or_merchant`)
     * - a linked party must belong to this household (`party_not_found`); its name
     *   becomes the `counterparty` snapshot
     * - typing a different `counterparty` without re-sending the link drops the
     *   link — the user replaced the name, not renamed the party
     * - empty `counterparty` clears both links
     * - `saveParty` turns a free-typed name into a Party and links it
     */
    async resolveCounterparty(
        patch: CounterpartyPatch,
        current: CounterpartyColumns = { counterparty: null, merchantKey: null, party: null }
    ): Promise<CounterpartyColumns> {
        const next: CounterpartyColumns = { ...current };

        if (patch.counterparty !== undefined) {
            const text = patch.counterparty ? normalizeName(patch.counterparty) : '';
            next.counterparty = text || null;
            if (next.counterparty !== current.counterparty) {
                if (patch.merchantKey === undefined) next.merchantKey = null;
                if (patch.partyId === undefined) next.party = null;
            }
        }
        if (patch.merchantKey !== undefined) next.merchantKey = patch.merchantKey || null;
        if (patch.partyId !== undefined) next.party = patch.partyId || null;

        if (next.merchantKey && next.party) throw apiBadRequest('party_or_merchant');

        if (next.party) {
            const party = await this.requireOwned(next.party);
            next.counterparty = party.name;
        }

        if (!next.counterparty) {
            next.merchantKey = null;
            next.party = null;
            return next;
        }

        if (patch.saveParty && !next.merchantKey && !next.party) {
            const party = await this.findOrCreate(next.counterparty);
            next.party = party.id;
            next.counterparty = party.name;
        }

        return next;
    }

    /** Nominate a party for the Rumtelo merchant catalog (aggregated by normalized name). */
    async suggest(partyId: string): Promise<PartySuggestResult> {
        const party = await this.requireOwned(partyId);
        if (party.merchantKey) throw apiBadRequest('party_already_in_catalog');

        const existingVote = await this.em.findOne(PartySuggestion, {
            party: party.id,
            household: currentHouseholdId(),
        });
        if (existingVote) throw apiConflict('party_already_suggested');

        const normalizedName = normalizeSuggestionKey(party.name);
        let suggestion = await this.em.findOne(MerchantSuggestion, { normalizedName });
        if (!suggestion) {
            suggestion = this.em.create(MerchantSuggestion, {
                normalizedName,
                name: party.name,
                website: party.website,
                logoDomain: party.logoDomain,
                householdCount: 0,
                status: MerchantSuggestionStatus.OPEN,
            } as never);
            this.em.persist(suggestion);
        }

        // Already accepted elsewhere — link this party to the catalog merchant.
        if (
            suggestion.status === MerchantSuggestionStatus.ACCEPTED &&
            suggestion.acceptedMerchantKey
        ) {
            party.merchantKey = suggestion.acceptedMerchantKey;
            const vote = this.em.create(PartySuggestion, {
                household: currentHouseholdId(),
                party,
                suggestion,
            } as never);
            await this.em.persist(vote).flush();
            return {
                partyId: party.id,
                suggestionId: suggestion.id,
                status: suggestion.status,
                householdCount: suggestion.householdCount,
            };
        }

        suggestion.householdCount += 1;
        if (!suggestion.website && party.website) suggestion.website = party.website;
        if (!suggestion.logoDomain && party.logoDomain) suggestion.logoDomain = party.logoDomain;

        const vote = this.em.create(PartySuggestion, {
            household: currentHouseholdId(),
            party,
            suggestion,
        } as never);
        await this.em.persist(vote).flush();

        return {
            partyId: party.id,
            suggestionId: suggestion.id,
            status: suggestion.status,
            householdCount: suggestion.householdCount,
        };
    }

    /**
     * Staff: accept a suggestion — mint a MerchantPreset (OTHER / Necessities),
     * stamp `acceptedMerchantKey`, and set `Party.merchantKey` for every voter.
     */
    async acceptSuggestion(suggestionId: string): Promise<MerchantSuggestion> {
        const suggestion = await this.em.findOne(MerchantSuggestion, { id: suggestionId });
        if (!suggestion) throw apiNotFound('party_not_found');
        if (suggestion.status === MerchantSuggestionStatus.ACCEPTED) return suggestion;

        const category = await this.em.findOneOrFail(
            CategoryTemplate,
            { key: 'OTHER' },
            { populate: ['jarTemplates'] }
        );
        const jar = category.primaryJarTemplate;

        let key = catalogKeyFromName(suggestion.name);
        let suffix = 0;
        while (await this.em.findOne(MerchantPreset, { key })) {
            suffix += 1;
            key = `${catalogKeyFromName(suggestion.name).slice(0, 56)}_${suffix}`;
        }

        const preset = this.em.create(MerchantPreset, {
            key,
            name: suggestion.name,
            sortOrder: 9000,
            isActive: true,
            isPartner: false,
            jarTemplate: jar,
            categoryTemplate: category,
        } as never);
        this.em.persist(preset);
        this.em.persist(
            this.em.create(MerchantMatching, {
                preset,
                matchValue: suggestion.name,
                aliases: [],
                providerIds: {},
            } as never)
        );
        this.em.persist(
            this.em.create(MerchantBranding, {
                preset,
                logoDomain: suggestion.logoDomain,
                website: suggestion.website,
            } as never)
        );

        suggestion.status = MerchantSuggestionStatus.ACCEPTED;
        suggestion.acceptedMerchantKey = key;

        const votes = await this.em.find(
            PartySuggestion,
            { suggestion: suggestion.id },
            {
                populate: ['party'],
            }
        );
        for (const vote of votes) {
            vote.party.merchantKey = key;
        }

        await this.em.flush();
        return suggestion;
    }

    /** Staff: reject a suggestion (households keep their Party unchanged). */
    async rejectSuggestion(suggestionId: string): Promise<MerchantSuggestion> {
        const suggestion = await this.em.findOne(MerchantSuggestion, { id: suggestionId });
        if (!suggestion) throw apiNotFound('party_not_found');
        suggestion.status = MerchantSuggestionStatus.REJECTED;
        await this.em.flush();
        return suggestion;
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    async list(): Promise<PartyWithUsage[]> {
        const rows = await this.parties.find({}, { orderBy: { name: 'asc' } });
        const usage = await this.usageByParty();
        const statusByParty = await this.suggestionStatusByParty(rows.map(row => row.id));
        return rows.map(party => ({
            ...this.toDto(party),
            usage: usage.get(party.id) ?? EMPTY_USAGE,
            suggestionStatus: statusByParty.get(party.id) ?? null,
        }));
    }

    /** Throws `party_not_found` unless the party exists in the current household. */
    async requireOwned(id: string): Promise<Party> {
        const party = await this.parties.findOne({ id });
        if (!party) throw apiNotFound('party_not_found');
        return party;
    }

    // ====================================================================
    // ? UPDATE Operations
    // ====================================================================

    async update(id: string, patch: Partial<Omit<PartyDto, 'id' | 'householdId'>>) {
        const party = await this.requireOwned(id);

        if (patch.name !== undefined) {
            const name = normalizeName(patch.name);
            if (!name) throw apiBadRequest('party_name_taken');
            const clash = await this.findByName(name);
            if (clash && clash.id !== party.id) throw apiConflict('party_name_taken');
            if (name !== party.name) {
                party.name = name;
                await this.fanOutName(party.id, name);
            }
        }
        if (patch.note !== undefined) party.note = patch.note;
        if (patch.aliases !== undefined) party.aliases = patch.aliases;
        if (patch.merchantKey !== undefined) party.merchantKey = patch.merchantKey;
        if (patch.color !== undefined) party.color = patch.color;
        if (patch.icon !== undefined) party.icon = patch.icon;
        if (patch.logoDomain !== undefined) party.logoDomain = patch.logoDomain;
        if (patch.website !== undefined) party.website = patch.website;

        await this.em.flush();
        return this.toDto(party);
    }

    /** Moves every linked row from `fromId` onto `intoId`, then deletes `fromId`. */
    async merge(fromId: string, intoId: string) {
        if (fromId === intoId) throw apiBadRequest('party_merge_same');
        const [from, into] = await Promise.all([
            this.requireOwned(fromId),
            this.requireOwned(intoId),
        ]);
        const household = currentHouseholdId();
        for (const { entity } of PARTY_LINKS) {
            await this.em.nativeUpdate(entity, { household, party: from.id }, {
                party: into.id,
                counterparty: into.name,
            } as never);
        }
        const merged = new Set([...into.aliases, from.name, ...from.aliases]);
        merged.delete(into.name);
        into.aliases = [...merged].slice(0, 20);
        this.parties.remove(from);
        await this.em.flush();
        return this.toDto(into);
    }

    // ====================================================================
    // ? DELETE Operations
    // ====================================================================

    /** Linked rows keep their `counterparty` text; the FK is `set null` at the DB. */
    async remove(id: string) {
        const party = await this.requireOwned(id);
        this.parties.remove(party);
        await this.em.flush();
        return { ok: true as const };
    }

    // ====================================================================
    // ? Helpers
    // ====================================================================

    private findByName(name: string): Promise<Party | null> {
        return this.parties.findOne({ name: { $ilike: escapeLike(name) } });
    }

    /** Keeps the `counterparty` snapshot on linked rows equal to the party name. */
    private async fanOutName(partyId: string, name: string) {
        const household = currentHouseholdId();
        for (const { entity } of PARTY_LINKS) {
            await this.em.nativeUpdate(entity, { household, party: partyId }, {
                counterparty: name,
            } as never);
        }
    }

    private async usageByParty(): Promise<Map<string, PartyUsage>> {
        const household = currentHouseholdId();
        const usage = new Map<string, PartyUsage>();
        for (const { entity, usage: key } of PARTY_LINKS) {
            // Count via find — QueryBuilder groupBy on mapToPk `party` is unreliable
            // across MikroORM versions and was 500ing parties.list during export.
            const rows = await this.em.find(
                entity,
                { household, party: { $ne: null } },
                { fields: ['party'] as never }
            );
            for (const row of rows) {
                const partyId = (row as { party: string | null }).party;
                if (!partyId) continue;
                const current = usage.get(partyId) ?? { ...EMPTY_USAGE };
                current[key] += 1;
                usage.set(partyId, current);
            }
        }
        return usage;
    }

    private async suggestionStatusByParty(
        partyIds: string[]
    ): Promise<Map<string, MerchantSuggestionStatus>> {
        const map = new Map<string, MerchantSuggestionStatus>();
        if (partyIds.length === 0) return map;
        const votes = await this.em.find(
            PartySuggestion,
            { party: { $in: partyIds }, household: currentHouseholdId() },
            { populate: ['suggestion', 'party'] }
        );
        for (const vote of votes) {
            const partyId = typeof vote.party === 'string' ? vote.party : vote.party?.id;
            const status = vote.suggestion?.status;
            if (partyId && status) map.set(partyId, status);
        }
        return map;
    }

    private toDto(party: Party): PartyDto {
        return {
            id: party.id,
            householdId: party.household,
            name: party.name,
            note: party.note ?? null,
            aliases: party.aliases ?? [],
            merchantKey: party.merchantKey ?? null,
            color: party.color ?? null,
            icon: party.icon ?? null,
            logoDomain: party.logoDomain ?? null,
            website: party.website ?? null,
        };
    }
}
