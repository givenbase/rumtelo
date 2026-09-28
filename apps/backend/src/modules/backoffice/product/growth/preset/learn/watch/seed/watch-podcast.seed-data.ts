import { PlanKey } from '@rumtelo/contracts';

import { podcast, type WatchSeedRow } from './watch-row';

/**
 * Show-level podcast pointers — Spotify to listen, show page as secondary.
 */
export const WATCH_PODCAST_SEED: readonly WatchSeedRow[] = [
    podcast({
        key: 'diary-of-a-ceo-podcast',
        name: 'The Diary of a CEO',
        creator: 'Steven Bartlett',
        description:
            'Long interviews with people who built something. Listen for the decision, not the highlight reel.',
        topic: 'EARN',
        minPlan: PlanKey.BASIC,
        spendingStyles: [],
        youtubeId: null,
        url: 'https://www.youtube.com/@TheDiaryOfACEO',
        watchUrl: 'https://open.spotify.com/show/7iQXmUT7XGuZSzAMjoNWlX',
    }),
    podcast({
        key: 'how-i-built-this',
        name: 'How I Built This',
        creator: 'Guy Raz',
        description:
            'The messy middle of building a company — the near-misses, not the victory lap.',
        topic: 'EARN',
        minPlan: PlanKey.BASIC,
        spendingStyles: [],
        youtubeId: null,
        url: 'https://www.npr.org/podcasts/510313/how-i-built-this',
        watchUrl: 'https://open.spotify.com/show/6E709HRH7XaiZrMfgtNCun',
    }),
    podcast({
        key: 'tim-ferriss-show',
        name: 'The Tim Ferriss Show',
        creator: 'Tim Ferriss',
        description:
            'Long-form tactics from people who ship. Steal the process, skip the guru glow.',
        topic: 'MIND',
        minPlan: PlanKey.BASIC,
        spendingStyles: [],
        youtubeId: null,
        url: 'https://tim.blog/podcast/',
        watchUrl: 'https://open.spotify.com/show/5qSUyCrk9KR69lEiXbjwXM',
    }),
    podcast({
        key: 'acquired-podcast',
        name: 'Acquired',
        creator: 'Ben Gilbert & David Rosenthal',
        description:
            'Company history as a playbook. How the winners were built — and what almost killed them.',
        topic: 'EARN',
        minPlan: PlanKey.BASIC,
        spendingStyles: [],
        youtubeId: null,
        url: 'https://www.acquired.fm/',
        watchUrl: 'https://open.spotify.com/show/7Fj0XEuUQLUqoMZQdsLXqp',
    }),
    podcast({
        key: 'huberman-lab',
        name: 'Huberman Lab',
        creator: 'Andrew Huberman',
        description: 'Science you can act on — sleep, focus, stress. Tools first, ego second.',
        topic: 'HEALTH',
        minPlan: PlanKey.BASIC,
        spendingStyles: [],
        youtubeId: null,
        url: 'https://www.hubermanlab.com/',
        watchUrl: 'https://open.spotify.com/show/79CkJF3UJTHFV8Dse3Oy0P',
    }),
];
