import { EmptyState, Section, Typography } from '@rumtelo/ui';

export const metadata = { title: 'Sleep' };

export default function SleepPage() {
    return (
        <div className="grid animate-rise gap-6">
            <Section eyebrow="My sleep" title="The floor everything else stands on.">
                <Typography as="p" variant="lead" size="default">
                    Sleep is not a budget you distribute — it is the input that determines how well
                    the rest of your day works. Deep sleep restores you; REM sleep sharpens you.
                </Typography>
            </Section>

            <EmptyState
                icon="🌙"
                title="Nog geen data"
                body="Slaaptracking komt binnenkort. Tot die tijd: noteer je uren in je weekoverzicht."
            />
        </div>
    );
}
