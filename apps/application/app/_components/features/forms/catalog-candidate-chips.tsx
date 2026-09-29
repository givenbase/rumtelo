'use client';

/** One catalog row the household can pick from (bill type, debt type, …). */
export type CatalogCandidate = {
    key: string;
    name: string;
    icon?: string | null;
};

/**
 * "Which KPN bill is this?" — a vendor is linked to several catalog presets,
 * so the household picks one. Rendered directly under the field it refines.
 */
export function CatalogCandidateChips<T extends CatalogCandidate>({
    label,
    candidates,
    disabled,
    onPick,
}: {
    label: string;
    candidates: readonly T[];
    disabled?: boolean;
    onPick: (candidate: T) => void;
}) {
    if (candidates.length === 0) return null;
    return (
        <div className="grid gap-1.5">
            <span className="text-sm text-fg-muted">{label}</span>
            <div className="flex flex-wrap gap-1.5">
                {candidates.map(candidate => (
                    <button
                        key={candidate.key}
                        type="button"
                        disabled={disabled}
                        className="inline-flex items-center gap-2 rounded-xl border border-line bg-raised px-2.5 py-1.5 text-sm text-fg hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-50"
                        onClick={() => onPick(candidate)}>
                        {candidate.icon ? <span aria-hidden>{candidate.icon}</span> : null}
                        {candidate.name}
                    </button>
                ))}
            </div>
        </div>
    );
}
