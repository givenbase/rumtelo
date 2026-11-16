import { useTranslations } from '@rumtelo/i18n';

/** Three small numbers above the list: steps this month, focus this week, goals to feed. */
export function CourseGoalsSummary({
    steps,
    focus,
    needingStep,
}: {
    steps: { done: number; total: number };
    focus: { done: number; total: number };
    needingStep: number;
}) {
    const t = useTranslations('features.growth.course.goal');
    const tiles = [
        { key: 'steps', label: t('summary_steps'), value: ratio(steps) },
        { key: 'focus', label: t('summary_focus'), value: ratio(focus) },
        { key: 'needing', label: t('summary_needing'), value: String(needingStep) },
    ];
    return (
        <dl className="grid grid-cols-3 gap-2 sm:gap-3">
            {tiles.map(tile => (
                <div
                    key={tile.key}
                    className="grid content-between gap-2 rounded-2xl border border-line bg-surface p-3 sm:p-4">
                    <dt className="font-mono text-[10px] leading-snug tracking-wide text-fg-muted uppercase">
                        {tile.label}
                    </dt>
                    <dd className="text-xl font-semibold text-fg tabular-nums sm:text-2xl">
                        {tile.value}
                    </dd>
                </div>
            ))}
        </dl>
    );
}

function ratio({ done, total }: { done: number; total: number }): string {
    return total === 0 ? '–' : `${done}/${total}`;
}
