import { VisibilityChoice } from '@rumtelo/contracts';
import type { IconName } from '@rumtelo/ui';

/** One icon per visibility choice — picker and badge must read the same. */
export const VISIBILITY_ICON: Record<VisibilityChoice, IconName> = {
    [VisibilityChoice.PRIVATE]: 'lock',
    [VisibilityChoice.OWNER]: 'eye',
    [VisibilityChoice.HOUSEHOLD]: 'eye',
    [VisibilityChoice.SHARED]: 'users',
};
