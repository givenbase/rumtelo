import { PlanKey } from '@rumtelo/contracts';

export type PlanSlug = 'basic' | 'plus' | 'max';

export function planSlug(key: PlanKey): PlanSlug {
    if (key === PlanKey.BASIC) return 'basic';
    if (key === PlanKey.PLUS) return 'plus';
    return 'max';
}
