'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { type LearnBookHit, type LearnBookPreset, type LearnBookDraft } from '@rumtelo/contracts';
import {
    Button,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    Input,
} from '@rumtelo/ui';

import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';

import {
    ABOUT_ORDER,
    aboutFields,
    aboutLabel,
    asLearnSkill,
    type LearnSkill,
} from './learn-catalog';

type AddLearningDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    householdId: string;
    /** The library search, when nothing we recommend matched. */
    initialQuery: string;
    books: readonly LearnBookPreset[];
    onPick: (pieceKey: string, skill: LearnSkill) => void;
};

/**
 * Search the public catalog and save a pointer on this household's shelf.
 * A title we already recommend is marked need-to-read instead of copied.
 */
export function AddLearningDialog({
    open,
    onOpenChange,
    householdId,
    initialQuery,
    books,
    onPick,
}: AddLearningDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Add learning</DialogTitle>
                    <DialogDescription>
                        Search by title. We save where to find it, not the book itself.
                    </DialogDescription>
                </DialogHeader>
                {open ? (
                    <AddLearningForm
                        key={initialQuery}
                        householdId={householdId}
                        initialQuery={initialQuery}
                        books={books}
                        onPick={onPick}
                        onDone={() => onOpenChange(false)}
                    />
                ) : null}
            </DialogContent>
        </Dialog>
    );
}

function AddLearningForm({
    householdId,
    initialQuery,
    books,
    onPick,
    onDone,
}: {
    householdId: string;
    initialQuery: string;
    books: readonly LearnBookPreset[];
    onPick: (pieceKey: string, skill: LearnSkill) => void;
    onDone: () => void;
}) {
    const queryClient = useQueryClient();
    const [query, setQuery] = useState(initialQuery);
    const [about, setAbout] = useState('MIND');
    const [hits, setHits] = useState<LearnBookHit[]>([]);
    const [searched, setSearched] = useState(false);

    const search = useMutation({
        mutationFn: (text: string) => api.growth.learn.searchBooks({ householdId, query: text }),
        onSuccess(next) {
            setHits(next);
            setSearched(true);
        },
    });
    const add = useMutation({
        mutationFn: (input: LearnBookDraft) =>
            api.growth.learn.createBook({ householdId, ...input }),
        onSuccess() {
            void queryClient.invalidateQueries({ queryKey: apiQuery.growth.learn.list.key() });
            void queryClient.invalidateQueries({
                queryKey: apiQuery.growth.learn.listBooks.key(),
            });
            onDone();
        },
    });

    function runSearch() {
        const text = query.trim();
        if (text.length < 2) return;
        search.mutate(text);
    }

    function pick(hit: LearnBookHit) {
        const known = books.find(book => book.isbn13 !== null && book.isbn13 === hit.isbn13);
        if (known) {
            onPick(known.key, asLearnSkill(known.skill));
            onDone();
            return;
        }
        const filed = aboutFields(about);
        add.mutate({ ...hit, ...filed });
    }

    return (
        <div className="grid gap-4">
            <form
                className="flex gap-2"
                onSubmit={event => {
                    event.preventDefault();
                    runSearch();
                }}>
                <Input
                    type="search"
                    value={query}
                    onChange={event => setQuery(event.target.value)}
                    placeholder="The 5 Love Languages"
                    aria-label="Search the public catalog"
                    className="min-w-0 flex-1"
                />
                <Button
                    type="submit"
                    size="sm"
                    disabled={query.trim().length < 2 || search.isPending}>
                    Search
                </Button>
            </form>

            <div className="flex flex-wrap gap-1.5">
                {ABOUT_ORDER.map(option => (
                    <button
                        key={option}
                        type="button"
                        onClick={() => setAbout(option)}
                        className={
                            option === about
                                ? 'rounded-full bg-accent-soft px-2.5 py-1 font-mono text-[11px] tracking-wide text-accent uppercase'
                                : 'rounded-full px-2.5 py-1 font-mono text-[11px] tracking-wide text-fg-muted uppercase'
                        }>
                        {aboutLabel(option)}
                    </button>
                ))}
            </div>

            {search.isError ? (
                <p className="text-sm text-danger">The catalog did not answer. Try again.</p>
            ) : null}
            {add.isError ? (
                <p className="text-sm text-danger">That title could not be saved.</p>
            ) : null}

            {hits.length > 0 ? (
                <ul className="grid max-h-72 gap-2 overflow-auto">
                    {hits.map(hit => (
                        <li key={hit.sourceKey}>
                            <button
                                type="button"
                                disabled={add.isPending}
                                onClick={() => pick(hit)}
                                className="flex w-full items-baseline justify-between gap-3 rounded-xl border border-line px-3 py-2.5 text-left hover:border-accent">
                                <span className="min-w-0">
                                    <span className="block truncate text-sm text-fg">
                                        {hit.name}
                                    </span>
                                    <span className="block truncate text-xs text-fg-muted">
                                        {hit.author}
                                    </span>
                                </span>
                                <span className="flex-none font-mono text-[11px] tracking-wide text-accent uppercase">
                                    Add
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            ) : searched && !search.isPending ? (
                <p className="text-sm text-fg-muted">Nothing under that name.</p>
            ) : null}
        </div>
    );
}
