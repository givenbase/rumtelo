import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';
import { ORPCError } from '@orpc/server';
import {
    ISBN13,
    LearnProgressStatus,
    type LearnBook as LearnBookDto,
    type LearnBookDraft,
    type LearnBookHit,
} from '@rumtelo/contracts';

import { HouseholdScopedRepository } from '../../../../../../common/household/household-scoped.repository';
import { AccountService } from '../../../../../auth/user/account/account.service';
import { ProgressService } from '../progress/progress.service';
import { LearnBook } from './book.entity';

const ADDED_LINE = 'Added by this household. We keep the pointer, not the book.';

type OpenLibraryDoc = {
    key?: string;
    title?: string;
    author_name?: string[];
    cover_i?: number;
    isbn?: string[];
};

@Injectable()
export class BookService {
    private readonly books: HouseholdScopedRepository<LearnBook>;

    constructor(
        @Inject(EntityManager) private readonly em: EntityManager,
        @Inject(AccountService) private readonly accounts: AccountService,
        @Inject(ProgressService) private readonly progress: ProgressService
    ) {
        this.books = new HouseholdScopedRepository(em, LearnBook);
    }

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    /** Store the pointer and put it on the person's shelf as need-to-read. */
    async create(input: LearnBookDraft): Promise<LearnBookDto> {
        const accountId = await this.accountId();
        const existing = await this.books.findOne({ sourceKey: input.sourceKey });
        const row =
            existing ??
            this.books.create({
                account: accountId,
                name: input.name,
                author: input.author,
                description: ADDED_LINE,
                skill: input.skill,
                coverId: input.coverId,
                isbn13: input.isbn13,
                url: input.url,
                sourceKey: input.sourceKey,
                topic: input.topic,
            });
        if (!existing) await this.em.persist(row).flush();

        const picked = await this.progress.has(row.id);
        if (!picked) {
            await this.progress.save({
                pieceKey: row.id,
                status: LearnProgressStatus.QUEUE,
                skill: row.skill,
                dueOn: null,
            });
        }
        return toBook(row);
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    async search(query: string): Promise<LearnBookHit[]> {
        const url = new URL('https://openlibrary.org/search.json');
        url.searchParams.set('q', query.trim());
        url.searchParams.set('limit', '8');
        url.searchParams.set('fields', 'key,title,author_name,cover_i,isbn');

        let body: { docs?: OpenLibraryDoc[] };
        try {
            const response = await fetch(url, {
                headers: { 'User-Agent': 'Rumtelo/1.0 (learn shelf)' },
                signal: AbortSignal.timeout(12_000),
            });
            if (!response.ok) {
                throw new ORPCError('BAD_GATEWAY', {
                    message: 'The book catalog did not answer.',
                });
            }
            body = (await response.json()) as { docs?: OpenLibraryDoc[] };
        } catch (error) {
            if (error instanceof ORPCError) throw error;
            throw new ORPCError('BAD_GATEWAY', { message: 'The book catalog did not answer.' });
        }

        const hits: LearnBookHit[] = [];
        const seen = new Set<string>();
        for (const doc of body.docs ?? []) {
            const hit = toHit(doc);
            if (!hit || seen.has(hit.sourceKey)) continue;
            seen.add(hit.sourceKey);
            hits.push(hit);
            if (hits.length === 8) break;
        }
        return hits;
    }

    async list(): Promise<LearnBookDto[]> {
        const rows = await this.books.find({}, { orderBy: { createdAt: 'DESC' } });
        return rows.map(toBook);
    }

    private async accountId(): Promise<string> {
        const { account } = await this.accounts.ensureCurrentAccount();
        return account.id;
    }
}

function toBook(row: LearnBook): LearnBookDto {
    return {
        id: row.id,
        householdId: row.household,
        sourceKey: row.sourceKey,
        name: row.name,
        author: row.author,
        description: row.description,
        skill: row.skill,
        topic: row.topic,
        coverId: row.coverId,
        isbn13: row.isbn13,
        url: row.url,
    };
}

function toHit(doc: OpenLibraryDoc): LearnBookHit | null {
    const name = clip(doc.title, 160);
    const author = clip(doc.author_name?.[0], 120);
    if (!name || !author) return null;

    const isbn13 = (doc.isbn ?? []).find(code => ISBN13.test(code)) ?? null;
    const catalogKey = doc.key?.replaceAll('/', '') ?? '';
    const sourceKey = (isbn13 ?? catalogKey).slice(0, 64);
    if (!sourceKey) return null;

    const page = doc.key?.startsWith('/')
        ? `https://openlibrary.org${doc.key}`
        : isbn13
          ? `https://openlibrary.org/isbn/${isbn13}`
          : null;
    if (!page || page.length > 280) return null;

    const coverId = typeof doc.cover_i === 'number' && doc.cover_i > 0 ? doc.cover_i : null;
    return { sourceKey, name, author, coverId, isbn13, url: page };
}

function clip(value: string | undefined, max: number): string | null {
    const trimmed = value?.trim();
    if (!trimmed) return null;
    return trimmed.slice(0, max);
}
