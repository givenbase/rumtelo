import { Typography } from '@rumtelo/ui';

import { FAQ, FAQ_SECTION } from '@/lib/landing-content';

import { CARD, SectionHeading } from './landing-primitives';

/** Native <details> — no client JS, keyboard-accessible, indexable. */
export function LandingFaq() {
    return (
        <section id="faq" className="border-t border-line bg-bg-app">
            <div className="mx-auto max-w-6xl px-4 py-12 lg:px-6 lg:py-20">
                <div className="grid gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-14">
                    <SectionHeading
                        eyebrow={FAQ_SECTION.eyebrow}
                        headline={FAQ_SECTION.headline}
                        lead="The things people ask before they start — answered the way we would answer a friend."
                    />

                    <div className="grid gap-2.5">
                        {FAQ.map((item, index) => (
                            <details
                                key={item.question}
                                open={index === 0}
                                className={`${CARD} group open:border-accent/35`}>
                                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
                                    <Typography as="h4" size="lg">
                                        {item.question}
                                    </Typography>
                                    <span
                                        className="grid size-7 shrink-0 place-items-center rounded-full border border-line font-mono text-sm text-fg-muted transition-transform group-open:rotate-45 group-open:border-accent group-open:text-accent"
                                        aria-hidden>
                                        +
                                    </span>
                                </summary>
                                <Typography
                                    as="p"
                                    size="sm"
                                    color="muted"
                                    className="border-t border-line px-5 py-4 text-pretty">
                                    {item.answer}
                                </Typography>
                            </details>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
