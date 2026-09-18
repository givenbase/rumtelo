import { Typography } from '@rumtelo/ui';

import { WHY } from '@/lib/landing-content';

import { CARD, Eyebrow } from './landing-primitives';

const BOOKS_ALWAYS = 3;

/**
 * Why we exist — one spine:
 *   founded for ourselves → grounded in proven books → brought to market for others.
 * Roadmap sits under that origin story.
 * On small screens, books collapse after the first three.
 */
export function LandingWhy() {
    const primaryBooks = WHY.books.slice(0, BOOKS_ALWAYS);
    const moreBooks = WHY.books.slice(BOOKS_ALWAYS);

    return (
        <section id="why" className="border-y border-line bg-bg-app">
            <div className="mx-auto max-w-6xl px-4 py-12 lg:px-6 lg:py-20">
                <div className="grid gap-10 lg:grid-cols-[minmax(0,6fr)_minmax(0,6fr)] lg:gap-14">
                    {/* Origin */}
                    <div className="min-w-0">
                        <Eyebrow>{WHY.eyebrow}</Eyebrow>
                        <blockquote className="mt-4">
                            <Typography as="h2" size="lg" className="max-w-2xl leading-[1.08]">
                                {WHY.quoteNl}
                            </Typography>
                            <p className="mt-2 font-mono text-xs font-medium tracking-wide text-fg-faint">
                                {WHY.quoteEn}
                            </p>
                        </blockquote>
                        <Typography as="p" variant="lead" className="mt-6">
                            {WHY.body}
                        </Typography>
                        <p className="mt-5 font-mono text-xs font-medium tracking-wide text-fg-faint">
                            {WHY.signature}
                        </p>

                        <div className="mt-8 flex flex-col gap-2 border-t border-line pt-6 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-6">
                            <Typography as="h3" size="lg">
                                {WHY.manifesto}
                            </Typography>
                            <Typography as="span" size="sm" color="muted">
                                {WHY.audience}
                            </Typography>
                        </div>
                    </div>

                    {/* Books that shaped the practice */}
                    <div className="min-w-0">
                        <Typography as="span" variant="eyebrow" color="primary">
                            ✦ {WHY.booksEyebrow}
                        </Typography>
                        <Typography
                            as="p"
                            size="sm"
                            color="muted"
                            className="mt-3 max-w-prose text-pretty">
                            {WHY.booksLead}
                        </Typography>
                        <ul className="mt-4 hidden gap-2.5 lg:grid">
                            {WHY.books.map(book => (
                                <BookCard key={book.title} book={book} />
                            ))}
                        </ul>

                        <div className="mt-4 lg:hidden">
                            <ul className="grid gap-2.5">
                                {primaryBooks.map(book => (
                                    <BookCard key={book.title} book={book} />
                                ))}
                            </ul>
                            {moreBooks.length > 0 ? (
                                <details className="group mt-2.5">
                                    <summary
                                        aria-label={`Show ${moreBooks.length} more books`}
                                        className="cursor-pointer list-none py-2 [&::-webkit-details-marker]:hidden">
                                        <Typography
                                            as="span"
                                            variant="eyebrow"
                                            color="primary"
                                            weight="semibold">
                                            <span className="group-open:hidden">
                                                + {moreBooks.length} more books
                                            </span>
                                            <span className="hidden group-open:inline">
                                                Show fewer
                                            </span>
                                        </Typography>
                                    </summary>
                                    <ul className="grid gap-2.5">
                                        {moreBooks.map(book => (
                                            <BookCard key={book.title} book={book} />
                                        ))}
                                    </ul>
                                </details>
                            ) : null}
                        </div>

                        <p className="mt-3 text-xs leading-relaxed text-fg-faint">
                            {WHY.booksNote}
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}

function BookCard({ book }: { book: (typeof WHY.books)[number] }) {
    return (
        <li className={`${CARD} grid gap-1 border-l-4 border-l-accent/50 p-4`}>
            <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <Typography as="h4">{book.title}</Typography>
                <span className="font-mono text-xs text-fg-faint">{book.author}</span>
            </span>
            <Typography as="span" variant="caption" color="muted">
                {book.line}
            </Typography>
        </li>
    );
}
