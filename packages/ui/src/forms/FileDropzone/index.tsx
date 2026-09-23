'use client';

import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';

import { cn } from '@rumtelo/utils';

import { Icon } from '../../display/Icon';

export type FileDropzoneProps = {
    accept?: string;
    disabled?: boolean;
    /** Shown when no file is selected. */
    idleLabel: string;
    /** Shown while a file is dragged over. */
    activeLabel: string;
    /** Secondary hint under the main label (formats, etc.). */
    hint?: string;
    /** Selected file name; null = empty. */
    fileName?: string | null;
    /** Replace / browse label when a file is already chosen. */
    replaceLabel?: string;
    /** Clear selected file. */
    clearLabel?: string;
    /** `compact` = tighter padding for Settings cards. */
    density?: 'default' | 'compact';
    className?: string;
    onFile: (file: File | null) => void;
};

/**
 * Click + drag-and-drop file picker (shadcn-style; no official shadcn Dropzone).
 * Single-file. Keeps native `<input type="file">` for a11y / OS pickers.
 */
export function FileDropzone({
    accept,
    disabled = false,
    idleLabel,
    activeLabel,
    hint,
    fileName = null,
    replaceLabel,
    clearLabel,
    density = 'default',
    className,
    onFile,
}: FileDropzoneProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);
    const dragDepth = useRef(0);

    function openPicker() {
        if (disabled) return;
        inputRef.current?.click();
    }

    function takeFile(file: File | undefined | null) {
        if (!file || disabled) return;
        onFile(file);
    }

    function onInputChange(event: ChangeEvent<HTMLInputElement>) {
        takeFile(event.target.files?.[0] ?? null);
        // Allow re-selecting the same path.
        event.target.value = '';
    }

    function onDragEnter(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        if (disabled) return;
        dragDepth.current += 1;
        setDragging(true);
    }

    function onDragLeave(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDragging(false);
    }

    function onDragOver(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
    }

    function onDrop(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        dragDepth.current = 0;
        setDragging(false);
        if (disabled) return;
        takeFile(event.dataTransfer.files?.[0] ?? null);
    }

    const hasFile = Boolean(fileName);

    return (
        <div className={cn('grid gap-2', className)}>
            <input
                ref={inputRef}
                type="file"
                accept={accept}
                className="sr-only"
                disabled={disabled}
                onChange={onInputChange}
            />
            <button
                type="button"
                disabled={disabled}
                onClick={openPicker}
                onDragEnter={onDragEnter}
                onDragLeave={onDragLeave}
                onDragOver={onDragOver}
                onDrop={onDrop}
                className={cn(
                    'flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 text-center transition-colors',
                    density === 'compact' ? 'py-5' : 'py-7',
                    dragging
                        ? 'border-accent bg-accent-soft/50 text-fg'
                        : hasFile
                          ? 'border-line bg-raised text-fg'
                          : 'bg-surface-raised/40 border-line text-fg-secondary hover:border-fg-faint hover:bg-raised',
                    disabled && 'cursor-not-allowed opacity-50'
                )}>
                <span
                    className={cn(
                        'flex size-10 items-center justify-center rounded-full border',
                        dragging
                            ? 'border-accent bg-accent/15 text-accent'
                            : 'border-line text-fg-muted'
                    )}
                    aria-hidden>
                    <Icon name={hasFile ? 'file-text' : 'upload'} size="md" />
                </span>
                <span className="text-sm font-medium text-fg">
                    {dragging ? activeLabel : hasFile ? fileName : idleLabel}
                </span>
                {!dragging && hint ? (
                    <span className="max-w-[36ch] text-xs text-pretty text-fg-muted">{hint}</span>
                ) : null}
                {!dragging && hasFile && replaceLabel ? (
                    <span className="font-mono text-[10px] tracking-widest text-accent uppercase">
                        {replaceLabel}
                    </span>
                ) : null}
            </button>
            {hasFile && clearLabel ? (
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                        onFile(null);
                        if (inputRef.current) inputRef.current.value = '';
                    }}
                    className="justify-self-start font-mono text-[10px] tracking-widest text-fg-muted uppercase hover:text-fg disabled:opacity-50">
                    {clearLabel}
                </button>
            ) : null}
        </div>
    );
}
