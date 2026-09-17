import { Typography } from '@rumtelo/ui';

import { PRINCIPLES, PRINCIPLES_SECTION } from '@/lib/landing-content';

import { LandingIcon } from './landing-icon';
import { Eyebrow } from './landing-primitives';

/** Dark band — the four rules the product will not break. Dutch line leads; English decodes. */
export function LandingPrinciples() {
    return (
        <section id="principles" className="bg-fg text-bg">
            <div className="mx-auto max-w-6xl px-4 py-12 lg:px-6 lg:py-20">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <Eyebrow className="text-accent-hover">
                            {PRINCIPLES_SECTION.eyebrow}
                        </Eyebrow>
                        <Typography as="h2" size="lg" className="mt-3.5 max-w-xl leading-[1.08]">
                            {PRINCIPLES_SECTION.headline}
                        </Typography>
                    </div>
                    <span className="font-mono text-xs font-medium tracking-widest text-bg/55 uppercase">
                        Code is English · product copy is English first
                    </span>
                </div>

                <ol className="mt-9 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                    {PRINCIPLES.map((principle, index) => (
                        <li
                            key={principle.nl}
                            className="grid content-start gap-3 rounded-2xl border border-bg/12 bg-bg/6 p-5 backdrop-blur-sm">
                            <span className="flex items-center justify-between">
                                <span className="grid size-9 place-items-center rounded-lg border border-bg/12 bg-bg/6 text-accent-hover">
                                    <LandingIcon name={principle.icon} size={17} />
                                </span>
                                <span className="font-mono text-xs font-semibold tracking-widest text-bg/45">
                                    0{index + 1}
                                </span>
                            </span>
                            <Typography
                                as="h3"
                                size="lg"
                                color="white"
                                className="leading-snug text-balance">
                                {principle.nl}
                            </Typography>
                            <span className="font-mono text-xs font-medium tracking-wide text-accent-hover uppercase">
                                {principle.en}
                            </span>
                            <span className="text-sm leading-relaxed text-pretty text-bg/70">
                                {principle.body}
                            </span>
                        </li>
                    ))}
                </ol>
            </div>
        </section>
    );
}
