'use client';

import { api } from '@/app/_lib/api';
import { useApiError } from '@/app/_lib/api-error-messages';
import { apiQuery } from '@/app/_lib/api-hooks';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';
import { zodResolver } from '@hookform/resolvers/zod';
import { type LearnBookDraft, type LearnBookHit, type LearnBookPreset } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';
import {
    Button,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    Form,
    FormControl,
    FormField,
    FormItem,
    Input,
} from '@rumtelo/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import {
    ABOUT_ORDER,
    SKILLS,
    aboutFields,
    asLearnSkill,
    type LearnSkill,
} from '../_utils/learn-catalog';
import { useLearnCatalogLabels } from '../_utils/learn-labels';

type AddLearningDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    householdId: string;
    initialQuery: string;
    books: readonly LearnBookPreset[];
    onPick: (pieceKey: string, skill: LearnSkill) => void;
};

const searchFormSchema = z.object({
    query: z.string().max(80),
    about: z.string().min(1),
});

type SearchFormValues = z.infer<typeof searchFormSchema>;

const ABOUT_ALL = 'ALL';

const SKILL_ABOUT: ReadonlySet<string> = new Set(
    SKILLS.filter(skill => skill.key !== 'MONEY').map(skill => skill.key)
);

function bookMatchesAbout(book: LearnBookPreset, about: string) {
    if (about === ABOUT_ALL) return true;
    if (SKILL_ABOUT.has(about)) return book.skill === about;
    return book.topic === about;
}

function bookMatchesQuery(book: LearnBookPreset, query: string) {
    const needle = query.trim().toLowerCase();
    if (needle.length < 2) return false;
    return (
        book.name.toLowerCase().includes(needle) ||
        book.author.toLowerCase().includes(needle) ||
        book.description.toLowerCase().includes(needle)
    );
}

/**
 * Suggest from our shelf as you type. Search reaches titles we have not listed.
 * We save a pointer, not the work.
 */
export function AddLearningDialog({
    open,
    onOpenChange,
    householdId,
    initialQuery,
    books,
    onPick,
}: AddLearningDialogProps) {
    const tLearn = useTranslations('features.growth.learn');
    const tUi = useTranslations();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg" closeLabel={tUi('ui.button.actions.close')}>
                <DialogHeader>
                    <DialogTitle>{tLearn('add_learning')}</DialogTitle>
                    <DialogDescription>{tLearn('add_learning_description')}</DialogDescription>
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
    const tLearn = useTranslations('features.growth.learn');
    const labels = useLearnCatalogLabels();
    const queryClient = useQueryClient();
    const { showToast } = useHouseholdShell();
    const apiError = useApiError();

    const form = useForm<SearchFormValues>({
        defaultValues: { query: initialQuery, about: ABOUT_ALL },
        resolver: zodResolver(searchFormSchema),
    });
    const query = useWatch({ control: form.control, name: 'query' }) ?? '';
    const about = useWatch({ control: form.control, name: 'about' }) ?? ABOUT_ALL;
    const aboutChosen = about !== ABOUT_ALL;
    const [committedQuery, setCommittedQuery] = useState(() =>
        initialQuery.trim().length >= 2 ? initialQuery.trim() : ''
    );

    const libraryHits = useMemo(() => {
        const text = query.trim();
        if (text.length < 2) return [];
        return books
            .filter(book => bookMatchesQuery(book, text) && bookMatchesAbout(book, about))
            .slice(0, 8);
    }, [about, books, query]);

    const searchOptions = apiQuery.growth.learn.searchBooks.queryOptions({
        input: { householdId, query: committedQuery || 'xx' },
    });
    const searchQuery = useQuery({
        ...searchOptions,
        enabled: committedQuery.length >= 2,
    });

    const hits: readonly LearnBookHit[] = searchQuery.data ?? [];
    const searched = committedQuery.length >= 2 && !searchQuery.isPending;
    const catalogHits = hits.filter(
        hit => !books.some(book => book.isbn13 !== null && book.isbn13 === hit.isbn13)
    );

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
        onError: (error: unknown) => showToast(apiError(error), 'error'),
    });

    function pickLibrary(book: LearnBookPreset) {
        onPick(book.key, asLearnSkill(book.skill));
        onDone();
    }

    function pick(hit: LearnBookHit) {
        const known = books.find(book => book.isbn13 !== null && book.isbn13 === hit.isbn13);
        if (known) {
            pickLibrary(known);
            return;
        }
        if (!aboutChosen) return;
        const filed = aboutFields(about);
        add.mutate({ ...hit, ...filed });
    }

    return (
        <Form {...form}>
            <form
                className="grid gap-4"
                onSubmit={form.handleSubmit(values => {
                    const text = values.query.trim();
                    if (text.length >= 2) setCommittedQuery(text);
                })}>
                <div className="flex gap-2">
                    <FormField
                        control={form.control}
                        name="query"
                        render={({ field }) => (
                            <FormItem className="min-w-0 flex-1">
                                <FormControl>
                                    <Input
                                        type="search"
                                        {...field}
                                        placeholder={tLearn('search_catalog_placeholder')}
                                        aria-label={tLearn('search_catalog_aria')}
                                        className="min-w-0 flex-1"
                                        autoComplete="off"
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                    <Button
                        type="submit"
                        size="sm"
                        disabled={query.trim().length < 2 || searchQuery.isFetching}>
                        {tLearn('search')}
                    </Button>
                </div>

                <FormField
                    control={form.control}
                    name="about"
                    render={({ field }) => (
                        <FormItem>
                            <div className="flex flex-wrap gap-1.5">
                                {[ABOUT_ALL, ...ABOUT_ORDER].map(option => (
                                    <button
                                        key={option}
                                        type="button"
                                        onClick={() => field.onChange(option)}
                                        className={
                                            option === field.value
                                                ? 'rounded-full bg-accent-soft px-2.5 py-1 font-mono text-[11px] tracking-wide text-accent uppercase'
                                                : 'rounded-full px-2.5 py-1 font-mono text-[11px] tracking-wide text-fg-muted uppercase'
                                        }>
                                        {option === ABOUT_ALL
                                            ? tLearn('filter_anything')
                                            : labels.aboutLabel(option)}
                                    </button>
                                ))}
                            </div>
                        </FormItem>
                    )}
                />

                {libraryHits.length > 0 ? (
                    <div className="grid gap-2">
                        <p className="font-mono text-[10px] tracking-wide text-fg-muted uppercase">
                            {tLearn('library_matches')}
                        </p>
                        <ul className="grid max-h-56 gap-2 overflow-auto">
                            {libraryHits.map(book => (
                                <li key={book.key}>
                                    <button
                                        type="button"
                                        onClick={() => pickLibrary(book)}
                                        className="flex w-full items-baseline justify-between gap-3 rounded-xl border border-line px-3 py-2.5 text-left hover:border-accent">
                                        <span className="min-w-0">
                                            <span className="block truncate text-sm text-fg">
                                                {book.name}
                                            </span>
                                            <span className="block truncate text-xs text-fg-muted">
                                                {book.author}
                                            </span>
                                        </span>
                                        <span className="flex-none font-mono text-[11px] tracking-wide text-accent uppercase">
                                            {tLearn('add_button')}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : null}

                {searchQuery.isError ? (
                    <p className="text-sm text-danger">{tLearn('catalog_error')}</p>
                ) : null}
                {add.isError ? <p className="text-sm text-danger">{tLearn('save_error')}</p> : null}

                {catalogHits.length > 0 ? (
                    <div className="grid gap-2">
                        <p className="font-mono text-[10px] tracking-wide text-fg-muted uppercase">
                            {tLearn('catalog_matches')}
                        </p>
                        {!aboutChosen ? (
                            <p className="text-sm text-fg-muted">{tLearn('pick_about_to_add')}</p>
                        ) : null}
                        <ul className="grid max-h-72 gap-2 overflow-auto">
                            {catalogHits.map(hit => (
                                <li key={hit.sourceKey}>
                                    <button
                                        type="button"
                                        disabled={add.isPending || !aboutChosen}
                                        onClick={() => pick(hit)}
                                        className="flex w-full items-baseline justify-between gap-3 rounded-xl border border-line px-3 py-2.5 text-left hover:border-accent disabled:opacity-50">
                                        <span className="min-w-0">
                                            <span className="block truncate text-sm text-fg">
                                                {hit.name}
                                            </span>
                                            <span className="block truncate text-xs text-fg-muted">
                                                {hit.author}
                                            </span>
                                        </span>
                                        <span className="flex-none font-mono text-[11px] tracking-wide text-accent uppercase">
                                            {tLearn('add_button')}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : searched && !searchQuery.isFetching && libraryHits.length === 0 ? (
                    <p className="text-sm text-fg-muted">{tLearn('nothing_found')}</p>
                ) : null}
            </form>
        </Form>
    );
}
