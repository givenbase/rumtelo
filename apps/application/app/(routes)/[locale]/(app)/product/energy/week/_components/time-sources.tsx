'use client';

import type { TimeSource } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';

import { timeEvidenceName, timeRegionName } from '@/app/_lib/time-meta';

type Props = {
    sources: ReadonlyArray<TimeSource>;
    summary?: string;
};

/**
 * Citations behind a band, folded by default. Region and evidence grade are shown
 * on every line so a reader can see the band was not built from one continent.
 */
export function TimeSources({ sources, summary }: Props) {
    const ts = useTranslations('features.energy.week.shape');
    const tm = useTranslations('features.energy.week.meta');
    const label = summary ?? ts('sources_summary');

    if (sources.length === 0) return null;
    return (
        <details className="group text-sm">
            <summary className="cursor-pointer list-none font-mono text-xs text-fg-muted select-none hover:text-fg">
                <span className="group-open:hidden">▸</span>
                <span className="hidden group-open:inline">▾</span> {label} ({sources.length})
            </summary>
            <ul className="mt-2 grid gap-2.5 border-l border-line pl-3">
                {sources.map(source => (
                    <li key={source.url} className="grid gap-1">
                        <span className="flex flex-wrap items-center gap-1.5">
                            <a
                                href={source.url}
                                target="_blank"
                                rel="noreferrer"
                                className="font-medium text-fg underline-offset-2 hover:underline">
                                {source.name}
                            </a>
                            <span className="rounded-full border border-line px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-fg-muted uppercase">
                                {timeRegionName(tm, source.region)}
                            </span>
                            <span className="rounded-full border border-line px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-fg-muted uppercase">
                                {timeEvidenceName(tm, source.evidence)}
                            </span>
                        </span>
                        <span className="text-xs leading-relaxed text-fg-muted">
                            {source.claim}
                        </span>
                    </li>
                ))}
            </ul>
        </details>
    );
}
