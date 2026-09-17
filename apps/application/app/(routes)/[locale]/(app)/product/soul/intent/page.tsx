import { Eyebrow, Section, Typography } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { PageContent } from '@/components/layout/page-content';

import { IntentStillnessLink } from './_components/intent-stillness-link';

export const metadata = { title: 'Intention' };

const CURRENT_INTENT = 'Ten minutes of stillness before I open my inbox.';

export default function IntentPage() {
    const hasIntent = Boolean(CURRENT_INTENT);

    return (
        <PageContent width="narrow" className="grid animate-rise gap-6">
            <Section eyebrow="Intention" title="One sentence for this week.">
                <Typography as="p" variant="lead" size="default">
                    Not a resolution. An instruction to yourself, small enough to keep.
                </Typography>
            </Section>

            {/* ── Intent card ── */}
            <div className="grid gap-4 rounded-2xl border border-accent/35 bg-surface p-6 shadow-glow">
                <Eyebrow>My intention</Eyebrow>

                <input
                    type="text"
                    defaultValue={CURRENT_INTENT}
                    placeholder="Write one sentence for this week…"
                    className={cn(
                        'w-full rounded-xl border border-line-strong bg-raised p-4',
                        'font-display text-lg tracking-tight text-fg lg:text-xl',
                        'placeholder:text-fg-faint',
                        'transition-colors focus:border-accent focus:outline-none'
                    )}
                />

                {hasIntent && (
                    <Typography as="p" variant="eyebrow" color="success">
                        ✦ Set for this week
                    </Typography>
                )}

                <IntentStillnessLink />
            </div>

            {/* ── Tip ── */}
            <Typography as="p" size="sm" color="muted" className="text-fg-faint">
                A good intention is small, concrete, and about behaviour — not an outcome. &quot;I
                check my jars every Sunday&quot; works better than &quot;I am more financially
                aware.&quot;
            </Typography>
        </PageContent>
    );
}
