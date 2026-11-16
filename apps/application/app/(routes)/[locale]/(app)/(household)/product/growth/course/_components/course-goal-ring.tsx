import { cn } from '@rumtelo/utils';

const RADIUS = 22;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Progress ring with the percentage in the middle. Decorative text, labelled as a whole. */
export function CourseGoalRing({
    percent,
    label,
    className,
}: {
    percent: number;
    label: string;
    className?: string;
}) {
    const share = Math.min(100, Math.max(0, percent)) / 100;
    return (
        <svg
            role="img"
            aria-label={label}
            viewBox="0 0 56 56"
            className={cn('size-14 shrink-0 sm:size-16', className)}>
            <g className="origin-center -rotate-90">
                <circle
                    cx="28"
                    cy="28"
                    r={RADIUS}
                    fill="none"
                    strokeWidth="5"
                    className="stroke-raised"
                />
                <circle
                    cx="28"
                    cy="28"
                    r={RADIUS}
                    fill="none"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={`${share * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                    className="stroke-accent"
                />
            </g>
            <text
                x="28"
                y="28"
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-fg font-mono text-[13px] font-semibold tabular-nums">
                {`${percent}%`}
            </text>
        </svg>
    );
}
