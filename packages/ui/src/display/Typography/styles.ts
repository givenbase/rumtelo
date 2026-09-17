import { cva } from 'class-variance-authority';

/**
 * Rumtelo Typography — CVA axes compose via Tailwind utilities.
 * Size ladders are `as` × `size` compoundVariants (no arbitrary text-[Npx]).
 */
const typographyVariants = cva('', {
    variants: {
        as: {
            h1: 'font-display tracking-tight text-balance',
            h2: 'font-display tracking-tight text-balance',
            h3: 'font-display tracking-tight',
            h4: 'font-display tracking-tight',
            p: 'font-sans',
            span: 'font-sans',
            label: 'font-sans',
        },
        size: {
            xs: '',
            sm: '',
            default: '',
            lg: '',
        },
        weight: {
            normal: 'font-normal',
            medium: 'font-medium',
            semibold: 'font-semibold',
            bold: 'font-bold',
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
        variant: {
            default: '',
            lead: 'text-pretty',
            caption: '',
            eyebrow: 'font-mono uppercase tracking-widest',
        },
    },
    compoundVariants: [
        // h1
        { as: 'h1', size: 'sm', class: 'text-lg leading-none' },
        { as: 'h1', size: 'default', class: 'text-3xl lg:text-4xl' },
        { as: 'h1', size: 'lg', class: 'text-4xl sm:text-5xl lg:text-7xl' },
        // h2
        { as: 'h2', size: 'sm', class: 'text-lg' },
        { as: 'h2', size: 'default', class: 'text-2xl' },
        { as: 'h2', size: 'lg', class: 'text-3xl lg:text-4xl' },
        // h3
        { as: 'h3', size: 'sm', class: 'text-base' },
        { as: 'h3', size: 'default', class: 'text-lg' },
        { as: 'h3', size: 'lg', class: 'text-xl' },
        // h4
        { as: 'h4', size: 'sm', class: 'text-sm' },
        { as: 'h4', size: 'default', class: 'text-base' },
        { as: 'h4', size: 'lg', class: 'text-lg' },
        // p
        { as: 'p', size: 'xs', class: 'text-xs' },
        { as: 'p', size: 'sm', class: 'text-sm' },
        { as: 'p', size: 'default', class: 'text-base leading-relaxed' },
        { as: 'p', size: 'lg', class: 'text-base leading-relaxed lg:text-lg' },
        // span
        { as: 'span', size: 'xs', class: 'text-xs' },
        { as: 'span', size: 'sm', class: 'text-sm' },
        { as: 'span', size: 'default', class: 'text-base' },
        { as: 'span', size: 'lg', class: 'text-lg' },
        // label
        { as: 'label', size: 'xs', class: 'text-xs' },
        { as: 'label', size: 'sm', class: 'text-sm' },
        { as: 'label', size: 'default', class: 'text-sm' },
        { as: 'label', size: 'lg', class: 'text-base' },
        // structural recipes (size rung when variant drives structure)
        { variant: 'lead', class: 'max-w-prose' },
        { variant: 'caption', class: 'text-xs' },
        { variant: 'eyebrow', class: 'text-xs' },
    ],
    defaultVariants: {
        as: 'p',
        size: 'default',
        weight: 'normal',
        color: 'default',
        variant: 'default',
    },
});

export default typographyVariants;
