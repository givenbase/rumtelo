import typographyVariants from '../../display/Typography/styles';

/** @deprecated Prefer `<Typography variant="eyebrow" />` — kept for className-only call sites. */
export const eyebrowClass = typographyVariants({
    as: 'p',
    size: 'xs',
    weight: 'medium',
    color: 'muted',
    variant: 'eyebrow',
});

export default eyebrowClass;
