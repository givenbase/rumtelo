'use client';

import * as React from 'react';

import { cn } from '@rumtelo/utils';

import controlClasses from './styles';

export const Input = React.forwardRef<
    HTMLInputElement,
    React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(controlClasses, className)} {...props} />;
});
Input.displayName = 'Input';

export type InputProps = React.ComponentPropsWithoutRef<typeof Input>;

export { controlClasses };
