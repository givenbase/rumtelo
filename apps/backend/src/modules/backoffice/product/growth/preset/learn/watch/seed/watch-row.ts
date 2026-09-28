import { LearnWatchKind, type LearnWatchPreset } from '@rumtelo/contracts';

/**
 * One watch-shelf row without sortOrder. Format comes from film / series / video / podcast / course.
 */
export type WatchSeedRow = Omit<LearnWatchPreset, 'sortOrder' | 'skill'> & {
    skill?: string;
};

type WatchFields = Omit<WatchSeedRow, 'format' | 'merchantKey'> & {
    merchantKey?: LearnWatchPreset['merchantKey'];
};

function withFormat(format: LearnWatchKind, row: WatchFields): WatchSeedRow {
    return { merchantKey: null, ...row, format };
}

export const film = (row: WatchFields) => withFormat(LearnWatchKind.FILM, row);
export const series = (row: WatchFields) => withFormat(LearnWatchKind.SERIES, row);
export const video = (row: WatchFields) => withFormat(LearnWatchKind.VIDEO, row);
/** Podcasts default to Spotify as the open-home; override merchantKey when needed. */
export const podcast = (row: WatchFields) =>
    withFormat(LearnWatchKind.PODCAST, { merchantKey: 'SPOTIFY', ...row });
export const course = (
    row: WatchFields & { merchantKey: NonNullable<LearnWatchPreset['merchantKey']> }
) => withFormat(LearnWatchKind.COURSE, row);
