import { type LearnWatchPreset } from '@rumtelo/contracts';

import { WATCH_FILM_SEED } from './watch-film.seed-data';
import { WATCH_PODCAST_SEED } from './watch-podcast.seed-data';
import { WATCH_SERIES_SEED } from './watch-series.seed-data';
import { WATCH_VIDEO_SEED } from './watch-video.seed-data';

/**
 * Canonical Learn watch shelf — films, series, videos, podcasts.
 * Split by LearnWatchKind so the shelf is not one flat list.
 * Loaded into backoffice.reference_growth_watch_preset.
 * We do not host the work.
 */
export const WATCH_PRESET_SEED: readonly (Omit<LearnWatchPreset, 'sortOrder' | 'skill'> & {
    skill?: string;
})[] = [...WATCH_FILM_SEED, ...WATCH_SERIES_SEED, ...WATCH_VIDEO_SEED, ...WATCH_PODCAST_SEED];
