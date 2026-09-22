import { cva } from 'class-variance-authority';

const iconVariants = cva('shrink-0', {
    defaultVariants: {
        size: 'md',
        color: 'inherit',
    },
    variants: {
        size: {
            sm: 'size-3.5',
            md: 'size-4',
            lg: 'size-5',
            xl: 'size-6',
        },
        color: {
            default: 'text-foreground',
            muted: 'text-muted-foreground',
            secondary: 'text-secondary-foreground',
            primary: 'text-primary',
            destructive: 'text-destructive',
            success: 'text-success',
            warning: 'text-warning',
            white: 'text-white',
            inherit: 'text-inherit',
        },
    },
});

export const ICON_SIZE_PX = {
    sm: 14,
    md: 16,
    lg: 20,
    xl: 24,
} as const;

export default iconVariants;
