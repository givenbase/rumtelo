interface ToggleProps {
    checked: boolean;
    label: string;
    hint?: string;
    onCheckedChange?: (next: boolean) => void;
    disabled?: boolean;
}

interface SwitchProps {
    checked: boolean;
    onCheckedChange?: (next: boolean) => void;
    disabled?: boolean;
    className?: string;
    'aria-label'?: string;
    'aria-labelledby'?: string;
    'aria-describedby'?: string;
    'aria-busy'?: boolean;
}

export type { SwitchProps, ToggleProps };
export default ToggleProps;
