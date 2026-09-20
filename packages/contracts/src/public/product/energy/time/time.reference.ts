/**
 * Time Reference (Energy)
 * Evidence bands per category, in minutes per week, with the sources behind them.
 *
 * Built deliberately from more than one continent. Western guidelines (Canada, WHO)
 * set most targets; Japan's MHLW and field studies from Tanzania and Namibia set the
 * floors lower than a North-American reader would expect; African time-use surveys
 * supply the unpaid-work lens. Where regions disagree, the band is the overlap and
 * the disagreement is stated in the `claim` — never hidden behind one number.
 *
 * Categories with no defensible number have `band: null`. The UI must present those
 * as "your target", not as health advice.
 */

import { TimeBandRegion, TimeCategory, TimeEvidence, TimeKind } from '../enums';
import type { TimeBand, TimeReference, TimeSource } from './time.schema';

export const MINUTES_PER_DAY = 1440;
export const MINUTES_PER_WEEK = MINUTES_PER_DAY * 7;

const hoursPerDay = (hours: number): number => Math.round(hours * 60 * 7);

/** SNA split every time-use survey uses. Derived, never stored. */
export const TIME_CATEGORY_KIND: Record<TimeCategory, TimeKind> = {
    [TimeCategory.SLEEP]: TimeKind.PERSONAL,
    [TimeCategory.PERSONAL_CARE]: TimeKind.PERSONAL,
    [TimeCategory.PAID_WORK]: TimeKind.PAID,
    [TimeCategory.STUDY]: TimeKind.PAID,
    [TimeCategory.HOUSEHOLD_CARE]: TimeKind.UNPAID,
    [TimeCategory.FAMILY_CARE]: TimeKind.UNPAID,
    [TimeCategory.TRAVEL]: TimeKind.UNPAID,
    [TimeCategory.VOLUNTEERING]: TimeKind.FREE,
    [TimeCategory.SOCIAL]: TimeKind.FREE,
    [TimeCategory.EXERCISE]: TimeKind.FREE,
    [TimeCategory.HOBBIES]: TimeKind.FREE,
    [TimeCategory.SCREEN]: TimeKind.FREE,
    [TimeCategory.STILLNESS]: TimeKind.FREE,
    [TimeCategory.FREE_OTHER]: TimeKind.FREE,
};

/** Display order: the body first, then obligations, then what you steer. */
export const TIME_CATEGORY_ORDER: readonly TimeCategory[] = [
    TimeCategory.SLEEP,
    TimeCategory.PERSONAL_CARE,
    TimeCategory.PAID_WORK,
    TimeCategory.STUDY,
    TimeCategory.HOUSEHOLD_CARE,
    TimeCategory.FAMILY_CARE,
    TimeCategory.TRAVEL,
    TimeCategory.EXERCISE,
    TimeCategory.SOCIAL,
    TimeCategory.STILLNESS,
    TimeCategory.HOBBIES,
    TimeCategory.VOLUNTEERING,
    TimeCategory.SCREEN,
    TimeCategory.FREE_OTHER,
];

// --------------------------------------------------------------------
// Sources — one object per citation so several categories can share it
// --------------------------------------------------------------------

const CSEP_24H: TimeSource = {
    name: 'Canadian 24-Hour Movement Guidelines (CSEP, 2020)',
    region: TimeBandRegion.NORTH_AMERICA,
    evidence: TimeEvidence.GUIDELINE,
    url: 'https://csepguidelines.ca/guidelines/adults-18-64/',
    claim: '7–9 h of good-quality sleep with consistent bed and wake times; ≤8 h sedentary and ≤3 h recreational screen time per day.',
};

const MHLW_SLEEP_2023: TimeSource = {
    name: 'Japan MHLW — Sleep Guide for Health Promotion 2023',
    region: TimeBandRegion.ASIA,
    evidence: TimeEvidence.GUIDELINE,
    url: 'https://www.mhlw.go.jp/content/001732662.pdf',
    claim: 'At least 6 h; 6–8 h considered sufficient for adults, with individual variation explicitly acknowledged. 80 h/month overtime (the karōshi line) leaves ~5.8 h for sleep.',
};

const YETISH_2015: TimeSource = {
    name: 'Yetish et al. 2015 — natural sleep in the Hadza, San and Tsimane',
    region: TimeBandRegion.AFRICA,
    evidence: TimeEvidence.STUDY,
    url: 'https://pubmed.ncbi.nlm.nih.gov/26480842/',
    claim: 'Hunter-gatherers without electricity sleep 5.7–7.1 h a night (average 6.4 h), about an hour longer in winter, and almost never nap.',
};

const WHO_ILO_2021: TimeSource = {
    name: 'WHO / ILO joint estimates on long working hours (2021)',
    region: TimeBandRegion.GLOBAL,
    evidence: TimeEvidence.STUDY,
    url: 'https://www.who.int/news/item/17-05-2021-long-working-hours-increasing-deaths-from-heart-disease-and-stroke-who-ilo',
    claim: 'Working ≥55 h/week vs 35–40 h: +35% stroke risk, +17% ischaemic heart disease. 41–48 h showed no clear effect; 49–54 h is borderline.',
};

const CHINA_SPC_2021: TimeSource = {
    name: 'Supreme People’s Court of China — “996” ruling (2021)',
    region: TimeBandRegion.ASIA,
    evidence: TimeEvidence.GUIDELINE,
    url: 'https://www.reuters.com/world/china/chinese-authorities-say-overtime-996-policy-is-illegal-2021-08-27/',
    claim: 'The 9-to-9, six-day week (72 h) was declared illegal; the statutory cap is 44 h/week with at most 36 h overtime per month.',
};

const WHO_PA_2020: TimeSource = {
    name: 'WHO guidelines on physical activity and sedentary behaviour (2020)',
    region: TimeBandRegion.GLOBAL,
    evidence: TimeEvidence.GUIDELINE,
    url: 'https://www.who.int/publications/i/item/9789240015128',
    claim: '150–300 min moderate or 75–150 min vigorous activity per week, plus strength work on 2+ days. More brings additional benefit; evidence was insufficient to set a sedentary-hours threshold.',
};

const MHLW_ACTIVITY_2023: TimeSource = {
    name: 'Japan MHLW — Physical Activity and Exercise Guide 2023',
    region: TimeBandRegion.ASIA,
    evidence: TimeEvidence.GUIDELINE,
    url: 'https://www.mhlw.go.jp/content/001194020.pdf',
    claim: '60 min/day of walking-level movement (≈8,000 steps), plus 60 min/week of harder exercise and strength training 2–3 days a week.',
};

const SPAG_2022: TimeSource = {
    name: 'Singapore Physical Activity Guidelines (HPB / SportSG, 2022)',
    region: TimeBandRegion.ASIA,
    evidence: TimeEvidence.GUIDELINE,
    url: 'https://www.hpb.gov.sg/newsroom/singapore-s-physical-activity-guidelines-revised-to-tackle-sedentarism-and-promote-variation-in-physical-activity/',
    claim: '150–300 min/week moderate activity, strength twice weekly, and break up any 90 min of sitting with 5–10 min of movement.',
};

const RAICHLEN_2017: TimeSource = {
    name: 'Raichlen et al. 2017 — physical activity and cardiovascular health in the Hadza',
    region: TimeBandRegion.AFRICA,
    evidence: TimeEvidence.STUDY,
    url: 'https://pubmed.ncbi.nlm.nih.gov/27723159/',
    claim: 'Hadza adults average ~135 min/day of moderate-to-vigorous activity into old age with no cardiovascular risk markers. 150 min/week is a floor, not an optimum.',
};

const SHARIF_2021: TimeSource = {
    name: 'Sharif, Mogilner & Hershfield 2021 — discretionary time and well-being',
    region: TimeBandRegion.NORTH_AMERICA,
    evidence: TimeEvidence.STUDY,
    url: 'https://doi.org/10.1037/pspp0000391',
    claim: 'Across 35,000 adults, well-being rises with free time up to ~2 h/day, plateaus to ~5 h, then falls — unless the extra time is social or purposeful.',
};

const WHITE_2019: TimeSource = {
    name: 'White et al. 2019 — 120 minutes a week in nature',
    region: TimeBandRegion.EUROPE,
    evidence: TimeEvidence.STUDY,
    url: 'https://www.nature.com/articles/s41598-019-44097-3',
    claim: '≥120 min/week in natural settings is associated with good health and well-being; gains plateau around 200–300 min. Association, not proof.',
};

const STATS_SA_2010: TimeSource = {
    name: 'Statistics South Africa — Time Use Survey 2010',
    region: TimeBandRegion.AFRICA,
    evidence: TimeEvidence.BENCHMARK,
    url: 'https://www.statssa.gov.za/publications/Report-02-02-00/Report-02-02-002010.pdf',
    claim: 'Women spent 3 h 15 min/day on household maintenance vs 1 h 28 min for men — the largest gender gap of any activity. Mothers of under-sevens added 1 h 25 min of care.',
};

const HETUS: TimeSource = {
    name: 'Eurostat — Harmonised European Time Use Surveys (HETUS)',
    region: TimeBandRegion.EUROPE,
    evidence: TimeEvidence.BENCHMARK,
    url: 'https://ec.europa.eu/eurostat/web/time-use-surveys/information-data',
    claim: 'Harmonised 10-minute diaries across ~20 European countries (incl. CBS Netherlands). The activity categories and the paid / unpaid / personal split used here follow its coding list.',
};

// --------------------------------------------------------------------
// Bands
// --------------------------------------------------------------------

const SLEEP_BAND: TimeBand = {
    floor: hoursPerDay(6),
    targetLow: hoursPerDay(7),
    targetHigh: hoursPerDay(9),
    ceiling: null,
    perDay: true,
};

/** Weekly by definition (WHO/ILO count hours per week, not per day). */
const PAID_WORK_BAND: TimeBand = {
    floor: null,
    targetLow: null,
    targetHigh: 48 * 60,
    ceiling: 55 * 60,
    perDay: false,
};

/** Weekly by definition (every guideline says "per week"). */
const EXERCISE_BAND: TimeBand = {
    floor: null,
    targetLow: 150,
    targetHigh: null,
    ceiling: null,
    perDay: false,
};

const SCREEN_BAND: TimeBand = {
    floor: null,
    targetLow: null,
    targetHigh: hoursPerDay(3),
    ceiling: null,
    perDay: true,
};

/** Sharif et al.'s 2–5 h/day, applied to the FREE kind as a whole. */
export const DISCRETIONARY_BAND: TimeBand = {
    floor: null,
    targetLow: hoursPerDay(2),
    targetHigh: hoursPerDay(5),
    ceiling: null,
    perDay: true,
};

export const DISCRETIONARY_SOURCES: readonly TimeSource[] = [SHARIF_2021, WHITE_2019];

export const TIME_REFERENCE: Record<TimeCategory, TimeReference> = {
    [TimeCategory.SLEEP]: {
        category: TimeCategory.SLEEP,
        kind: TimeKind.PERSONAL,
        band: SLEEP_BAND,
        sources: [CSEP_24H, MHLW_SLEEP_2023, YETISH_2015],
    },
    [TimeCategory.PERSONAL_CARE]: {
        category: TimeCategory.PERSONAL_CARE,
        kind: TimeKind.PERSONAL,
        band: null,
        sources: [HETUS],
    },
    [TimeCategory.PAID_WORK]: {
        category: TimeCategory.PAID_WORK,
        kind: TimeKind.PAID,
        band: PAID_WORK_BAND,
        sources: [WHO_ILO_2021, MHLW_SLEEP_2023, CHINA_SPC_2021],
    },
    [TimeCategory.STUDY]: {
        category: TimeCategory.STUDY,
        kind: TimeKind.PAID,
        band: null,
        sources: [],
    },
    [TimeCategory.HOUSEHOLD_CARE]: {
        category: TimeCategory.HOUSEHOLD_CARE,
        kind: TimeKind.UNPAID,
        band: null,
        sources: [STATS_SA_2010, HETUS],
    },
    [TimeCategory.FAMILY_CARE]: {
        category: TimeCategory.FAMILY_CARE,
        kind: TimeKind.UNPAID,
        band: null,
        sources: [STATS_SA_2010],
    },
    [TimeCategory.TRAVEL]: {
        category: TimeCategory.TRAVEL,
        kind: TimeKind.UNPAID,
        band: null,
        sources: [],
    },
    [TimeCategory.VOLUNTEERING]: {
        category: TimeCategory.VOLUNTEERING,
        kind: TimeKind.FREE,
        band: null,
        sources: [],
    },
    [TimeCategory.SOCIAL]: {
        category: TimeCategory.SOCIAL,
        kind: TimeKind.FREE,
        band: null,
        sources: [SHARIF_2021],
    },
    [TimeCategory.EXERCISE]: {
        category: TimeCategory.EXERCISE,
        kind: TimeKind.FREE,
        band: EXERCISE_BAND,
        sources: [WHO_PA_2020, MHLW_ACTIVITY_2023, SPAG_2022, RAICHLEN_2017],
    },
    [TimeCategory.HOBBIES]: {
        category: TimeCategory.HOBBIES,
        kind: TimeKind.FREE,
        band: null,
        sources: [],
    },
    [TimeCategory.SCREEN]: {
        category: TimeCategory.SCREEN,
        kind: TimeKind.FREE,
        band: SCREEN_BAND,
        sources: [CSEP_24H, WHO_PA_2020],
    },
    [TimeCategory.STILLNESS]: {
        category: TimeCategory.STILLNESS,
        kind: TimeKind.FREE,
        band: null,
        sources: [],
    },
    [TimeCategory.FREE_OTHER]: {
        category: TimeCategory.FREE_OTHER,
        kind: TimeKind.FREE,
        band: null,
        sources: [HETUS],
    },
};
