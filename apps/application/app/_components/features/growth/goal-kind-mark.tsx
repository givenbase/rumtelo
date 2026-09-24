'use client';

import type { Goal, MerchantPreset } from '@rumtelo/contracts';
import { GoalKind } from '@rumtelo/contracts';
import { VendorMark } from '@rumtelo/ui';

import { carMarkForName } from '@/app/_lib/car-brands';

function emojiForGoal(goal: Goal): string {
    if (goal.icon?.trim()) return goal.icon.trim();
    if (goal.kind === GoalKind.EARN) return '📈';
    if (goal.kind === GoalKind.GIVE) return '💛';
    return '🎯';
}

/**
 * Goal list/detail mark: brand logo when the name matches a car marque,
 * otherwise the preset / kind emoji.
 */
export function GoalKindMark({
    goal,
    merchants,
    size = 16,
}: {
    goal: Goal;
    merchants: readonly MerchantPreset[];
    size?: number;
}) {
    const brand = carMarkForName(goal.name, merchants, size * 2);
    if (brand) {
        return (
            <VendorMark
                name={brand.name}
                src={brand.src}
                fallbackIcon={brand.fallbackIcon ?? emojiForGoal(goal)}
                tone={brand.tone}
                size={size}
            />
        );
    }
    return (
        <span aria-hidden className="leading-none" style={{ fontSize: size }}>
            {emojiForGoal(goal)}
        </span>
    );
}
