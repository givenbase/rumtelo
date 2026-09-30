import { cva } from 'class-variance-authority';

const badgeVariants = cva(
    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
    {
        defaultVariants: { tone: 'neutral' },
        variants: {
            tone: {
                neutral: 'border border-fg-muted bg-raised text-fg-secondary',
                success: 'border border-success bg-success/10 text-success',
                warning: 'border border-warning bg-warning/10 text-warning',
                danger: 'border border-danger bg-danger/10 text-danger',
            },
        },
    }
);

export default badgeVariants;
