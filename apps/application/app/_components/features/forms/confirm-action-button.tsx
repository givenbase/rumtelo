'use client';

import { useState } from 'react';

import { useTranslations } from '@rumtelo/i18n';
import { Button, type ButtonProps } from '@rumtelo/ui';

type ConfirmActionButtonProps = {
    label: string;
    confirmLabel: string;
    pendingLabel?: string;
    pending?: boolean;
    onConfirm: () => void;
} & Omit<ButtonProps, 'onClick' | 'children' | 'type'>;

/** Two-click confirm so destructive actions do not use `window.confirm`. */
export function ConfirmActionButton({
    label,
    confirmLabel,
    pendingLabel,
    pending,
    disabled,
    onConfirm,
    ...props
}: ConfirmActionButtonProps) {
    const tForm = useTranslations('ui.form');
    const [armed, setArmed] = useState(false);
    const pendingText = pendingLabel ?? tForm('deleting');

    return (
        <Button
            type="button"
            disabled={disabled}
            onBlur={() => setArmed(false)}
            onClick={() => {
                if (!armed) {
                    setArmed(true);
                    return;
                }
                setArmed(false);
                onConfirm();
            }}
            {...props}>
            {pending ? pendingText : armed ? confirmLabel : label}
        </Button>
    );
}
