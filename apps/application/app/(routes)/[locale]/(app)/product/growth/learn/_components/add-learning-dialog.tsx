'use client';

import { api } from '@/app/_lib/api';
import { useApiError } from '@/app/_lib/api-error-messages';
import { apiQuery } from '@/app/_lib/api-hooks';
import { useAppShell } from '@/components/features/shell/app-shell-context';
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
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import { ABOUT_ORDER, aboutFields, asLearnSkill, type LearnSkill } from '../_utils/learn-catalog';
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

/**
 * Search the public catalog and save a pointer on this household's shelf.
 * Fields: useForm. Results: TanStack query (not mutation + hits state).
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
    const { showToast } = useAppShell();
    const apiError = useApiError();

    const form = useForm<SearchFormValues>({
        defaultValues: { query: initialQuery, about: 'MIND' },
        resolver: zodResolver(searchFormSchema),
    });
    const query = useWatch({ control: form.control, name: 'query' }) ?? '';
    const about = useWatch({ control: form.control, name: 'about' }) ?? 'MIND';
    const [committedQuery, setCommittedQuery] = useState(() =>
        initialQuery.trim().length >= 2 ? initialQuery.trim() : ''
    );

    const searchOptions = apiQuery.growth.learn.searchBooks.queryOptions({
        input: { householdId, query: committedQuery || 'xx' },
    });
    const searchQuery = useQuery({
        ...searchOptions,
        enabled: committedQuery.length >= 2,
    });

    const hits: readonly LearnBookHit[] = searchQuery.data ?? [];
    const searched = committedQuery.length >= 2 && !searchQuery.isPending;

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
                                {ABOUT_ORDER.map(option => (
                                    <button
                                        key={option}
                                        type="button"
                                        onClick={() => field.onChange(option)}
                                        className={
                                            option === field.value
                                                ? 'rounded-full bg-accent-soft px-2.5 py-1 font-mono text-[11px] tracking-wide text-accent uppercase'
                                                : 'rounded-full px-2.5 py-1 font-mono text-[11px] tracking-wide text-fg-muted uppercase'
                                        }>
                                        {labels.aboutLabel(option)}
                                    </button>
                                ))}
                            </div>
                        </FormItem>
                    )}
                />

                {searchQuery.isError ? (
                    <p className="text-sm text-danger">{tLearn('catalog_error')}</p>
                ) : null}
                {add.isError ? <p className="text-sm text-danger">{tLearn('save_error')}</p> : null}

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
                                        {tLearn('add_button')}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : searched && !searchQuery.isFetching ? (
                    <p className="text-sm text-fg-muted">{tLearn('nothing_found')}</p>
                ) : null}
            </form>
        </Form>
    );
}
