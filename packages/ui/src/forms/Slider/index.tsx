'use client';

import * as React from 'react';

import { cn } from '@rumtelo/utils';
import { Slider as SliderPrimitive } from 'radix-ui';

/**
 * shadcn-style range/value slider on Radix.
 * `value` / `defaultValue` are always arrays — one thumb or two for a range.
 */
const Slider = React.forwardRef<
    React.ComponentRef<typeof SliderPrimitive.Root>,
    React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, value, defaultValue, ...props }, ref) => {
    const thumbs = value ?? defaultValue ?? [0];

    return (
        <SliderPrimitive.Root
            ref={ref}
            value={value}
            defaultValue={defaultValue}
            className={cn(
                'relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50',
                className
            )}
            {...props}>
            <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-sunken">
                <SliderPrimitive.Range className="absolute h-full bg-accent" />
            </SliderPrimitive.Track>
            {thumbs.map((_, index) => (
                <SliderPrimitive.Thumb
                    key={index}
                    className="ring-offset-canvas block size-4 shrink-0 rounded-full border border-accent/40 bg-raised shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none"
                />
            ))}
        </SliderPrimitive.Root>
    );
});
Slider.displayName = 'Slider';

export { Slider };
