import { LearnWatchKind, type LearnWatchPreset } from '@rumtelo/contracts';

/**
 * One watch-shelf row without sortOrder. Format comes from film / series / video / podcast.
 */
export type WatchSeedRow = Omit<LearnWatchPreset, 'sortOrder' | 'skill'> & {
    skill?: string;
};

type WatchFields = Omit<WatchSeedRow, 'format'>;

function withFormat(format: LearnWatchKind, row: WatchFields): WatchSeedRow {
    return { ...row, format };
}

export const film = (row: WatchFields) => withFormat(LearnWatchKind.FILM, row);
export const series = (row: WatchFields) => withFormat(LearnWatchKind.SERIES, row);
export const video = (row: WatchFields) => withFormat(LearnWatchKind.VIDEO, row);
export const podcast = (row: WatchFields) => withFormat(LearnWatchKind.PODCAST, row);
