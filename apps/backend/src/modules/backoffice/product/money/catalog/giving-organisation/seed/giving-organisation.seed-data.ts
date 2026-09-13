import { GivingCause, GivingEvaluator, type GivingSignal } from '@rumtelo/contracts';

type Seed = {
    key: string;
    name: string;
    summary: string;
    causes: GivingCause[];
    country: string | null;
    scope: string | null;
    website: string;
    signals: GivingSignal[];
    reporting: string | null;
};

const { GLOBAL_HEALTH, POVERTY, WATER, CLIMATE, ANIMALS, COMMUNITY, EMERGENCY } = GivingCause;
const {
    GIVEWELL,
    GIVING_WHAT_WE_CAN,
    FOUNDERS_PLEDGE,
    GIVING_GREEN,
    ANIMAL_CHARITY_EVALUATORS,
    DONEER_EFFECTIEF,
    CHARITY_NAVIGATOR,
    CBF,
    ANBI,
} = GivingEvaluator;

const GIVEWELL_TOP = 'https://www.givewell.org/charities/top-charities';
const GWWC_2026 = 'https://www.givingwhatwecan.org/best-charities-to-donate-to-2026';
const DONEER_EFFECTIEF_LIST = 'https://doneereffectief.nl/beste-goede-doelen/';
const ACE_RECOMMENDED = 'https://animalcharityevaluators.org/recommended-charities/';
const GIVING_GREEN_TOP = 'https://www.givinggreen.earth/top-climate-nonprofits';

/**
 * Giving organisation catalog (English). Sort = array order.
 *
 * Editorial rules:
 * - Every row cites at least one *independent* signal with a source URL and the
 *   year it was last confirmed. Refresh yearly: GiveWell (Nov/Dec), ACE (Nov),
 *   Giving Green / Founders Pledge (Nov–Dec), Doneer Effectief (Dec + quarterly),
 *   CBF register (continuous).
 * - No education row: no rigorous evaluator currently recommends one. Better an
 *   honest gap than a padded list.
 * - Large agency brands are deliberately absent; the list favours organisations
 *   that publish what reached the programme and what changed.
 */
export const GIVING_ORGANISATION_SEED: readonly Seed[] = [
    // ── Global health ────────────────────────────────────────────────────────
    {
        key: 'AGAINST_MALARIA_FOUNDATION',
        name: 'Against Malaria Foundation',
        summary:
            'Funds long-lasting insecticidal bed nets and tracks whether they are used, distribution by distribution.',
        causes: [GLOBAL_HEALTH],
        country: 'GB',
        scope: 'Sub-Saharan Africa',
        website: 'https://www.againstmalaria.com/',
        signals: [
            { evaluator: GIVEWELL, label: 'Top Charity', url: GIVEWELL_TOP, year: 2026 },
            { evaluator: GIVING_WHAT_WE_CAN, label: 'Recommended', url: GWWC_2026, year: 2026 },
            {
                evaluator: DONEER_EFFECTIEF,
                label: 'Top 10',
                url: DONEER_EFFECTIEF_LIST,
                year: 2026,
            },
            {
                evaluator: CHARITY_NAVIGATOR,
                label: '4-star',
                url: 'https://www.charitynavigator.org/ein/203069841',
                year: 2026,
            },
            {
                evaluator: ANBI,
                label: 'Tax-deductible in NL',
                url: 'https://www.againstmalaria.com/charitystatus.aspx',
                year: 2026,
            },
        ],
        reporting:
            'Every gift is linked to a named net distribution; usage checked at 9, 18 and 27 months; live accounts online.',
    },
    {
        key: 'MALARIA_CONSORTIUM',
        name: 'Malaria Consortium',
        summary:
            'Seasonal malaria chemoprevention for children under five in seven African countries.',
        causes: [GLOBAL_HEALTH],
        country: 'GB',
        scope: 'Sahel & East Africa',
        website: 'https://www.malariaconsortium.org/',
        signals: [
            { evaluator: GIVEWELL, label: 'Top Charity', url: GIVEWELL_TOP, year: 2026 },
            { evaluator: GIVING_WHAT_WE_CAN, label: 'Recommended', url: GWWC_2026, year: 2026 },
            {
                evaluator: CHARITY_NAVIGATOR,
                label: '3-star',
                url: 'https://www.charitynavigator.org/ein/980627052',
                year: 2026,
            },
        ],
        reporting:
            'Audited trustees’ report, yearly impact report and a coverage & quality report per campaign season.',
    },
    {
        key: 'HELEN_KELLER_INTL',
        name: 'Helen Keller Intl',
        summary:
            'Vitamin A supplementation campaigns with fourteen African governments, at very low cost per child per year.',
        causes: [GLOBAL_HEALTH],
        country: 'US',
        scope: 'Sub-Saharan Africa',
        website: 'https://helenkellerintl.org/',
        signals: [
            { evaluator: GIVEWELL, label: 'Top Charity', url: GIVEWELL_TOP, year: 2026 },
            { evaluator: GIVING_WHAT_WE_CAN, label: 'Recommended', url: GWWC_2026, year: 2026 },
            {
                evaluator: DONEER_EFFECTIEF,
                label: 'Top 10',
                url: DONEER_EFFECTIEF_LIST,
                year: 2026,
            },
            {
                evaluator: CHARITY_NAVIGATOR,
                label: '4-star',
                url: 'https://www.charitynavigator.org/ein/135562162',
                year: 2026,
            },
        ],
        reporting:
            'Annual report, audited statements and full narrative reports to GiveWell, all public.',
    },
    {
        key: 'NEW_INCENTIVES',
        name: 'New Incentives',
        summary:
            'Small cash incentives so caregivers in northern Nigeria complete routine childhood vaccinations.',
        causes: [GLOBAL_HEALTH],
        country: 'US',
        scope: 'Northern Nigeria',
        website: 'https://www.newincentives.org/',
        signals: [
            { evaluator: GIVEWELL, label: 'Top Charity', url: GIVEWELL_TOP, year: 2026 },
            { evaluator: GIVING_WHAT_WE_CAN, label: 'Recommended', url: GWWC_2026, year: 2026 },
            {
                evaluator: DONEER_EFFECTIEF,
                label: 'Top 10',
                url: DONEER_EFFECTIEF_LIST,
                year: 2026,
            },
            {
                evaluator: CHARITY_NAVIGATOR,
                label: '4-star',
                url: 'https://www.charitynavigator.org/ein/452368993',
                year: 2026,
            },
        ],
        reporting:
            'Live public dashboard of infants enrolled and cost per infant; quarterly impact reports; independent coverage surveys.',
    },
    {
        key: 'GIVEWELL_ALL_GRANTS_FUND',
        name: 'GiveWell All Grants Fund',
        summary:
            'A pooled fund that grants to whichever programmes clear GiveWell’s cost-effectiveness bar this year.',
        causes: [GLOBAL_HEALTH, POVERTY],
        country: 'US',
        scope: 'Global',
        website: 'https://www.givewell.org/all-grants-fund',
        signals: [
            {
                evaluator: GIVING_WHAT_WE_CAN,
                label: 'Recommended fund',
                url: GWWC_2026,
                year: 2026,
            },
            {
                evaluator: ANBI,
                label: 'Tax-deductible in NL',
                url: 'https://www.givewell.org/about/donate/tax-deductibility',
                year: 2026,
            },
        ],
        reporting:
            'Every grant published with its reasoning and a later look-back; donors are told which programme received their money.',
    },

    // ── Direct to people ─────────────────────────────────────────────────────
    {
        key: 'GIVEDIRECTLY',
        name: 'GiveDirectly',
        summary:
            'Unconditional cash, sent by mobile money, to households in extreme poverty — they decide what they need.',
        causes: [POVERTY, EMERGENCY],
        country: 'US',
        scope: 'East Africa & beyond',
        website: 'https://www.givedirectly.org/',
        signals: [
            {
                evaluator: DONEER_EFFECTIEF,
                label: 'Top 10',
                url: DONEER_EFFECTIEF_LIST,
                year: 2026,
            },
            {
                evaluator: CHARITY_NAVIGATOR,
                label: '4-star',
                url: 'https://www.charitynavigator.org/ein/271661997',
                year: 2026,
            },
            {
                evaluator: GIVEWELL,
                label: 'Cash-transfer benchmark',
                url: 'https://www.givewell.org/charities/give-directly',
                year: 2026,
            },
        ],
        reporting:
            'GDLive: unfiltered recipient updates in real time; audits and filings by year; a yearly fraud & safeguarding report.',
    },
    {
        key: '100WEEKS',
        name: '100WEEKS',
        summary:
            'A fixed weekly amount for a hundred weeks, plus training and savings groups, for women in extreme poverty.',
        causes: [POVERTY],
        country: 'NL',
        scope: 'East & West Africa',
        website: 'https://www.100weeks.nl/',
        signals: [
            {
                evaluator: CBF,
                label: 'Erkend Goed Doel',
                url: 'https://cbf.nl/organisaties/100weeks',
                year: 2026,
            },
        ],
        reporting:
            'Donors follow the group they fund for the full hundred weeks; yearly impact report with a four-year follow-up.',
    },

    // ── Water ────────────────────────────────────────────────────────────────
    {
        key: 'EVIDENCE_ACTION',
        name: 'Evidence Action',
        summary:
            'Chlorine dispensers and in-line chlorination so drinking water is safe where its absence kills children.',
        causes: [WATER, GLOBAL_HEALTH],
        country: 'US',
        scope: 'Africa & South Asia',
        website: 'https://www.evidenceaction.org/',
        signals: [
            {
                evaluator: GIVEWELL,
                label: 'Grantee · 2025 look-back',
                url: 'https://www.givewell.org/research/lookbacks/Dispensers-for-Safe-Water-2025',
                year: 2025,
            },
            {
                evaluator: CHARITY_NAVIGATOR,
                label: '4-star',
                url: 'https://www.charitynavigator.org/ein/900874591',
                year: 2026,
            },
        ],
        reporting:
            'Yearly “Year in Review”; publicly revised its own numbers down when Kenya usage data disappointed.',
    },

    // ── Climate ──────────────────────────────────────────────────────────────
    {
        key: 'CLEAN_AIR_TASK_FORCE',
        name: 'Clean Air Task Force',
        summary:
            'Policy and technical advocacy for neglected decarbonisation — methane, geothermal, nuclear, shipping.',
        causes: [CLIMATE],
        country: 'US',
        scope: 'Global · EU office in Rotterdam',
        website: 'https://www.catf.us/',
        signals: [
            {
                evaluator: FOUNDERS_PLEDGE,
                label: 'Top climate pick',
                url: 'https://www.founderspledge.com/research/clean-air-task-force',
                year: 2026,
            },
            {
                evaluator: GIVING_GREEN,
                label: 'Top Climate Nonprofit',
                url: GIVING_GREEN_TOP,
                year: 2026,
            },
            {
                evaluator: DONEER_EFFECTIEF,
                label: 'Top 10',
                url: DONEER_EFFECTIEF_LIST,
                year: 2026,
            },
            {
                evaluator: CHARITY_NAVIGATOR,
                label: '4-star',
                url: 'https://www.charitynavigator.org/ein/043512550',
                year: 2026,
            },
        ],
        reporting: 'Annual impact report; filings public.',
    },
    {
        key: 'FUTURE_CLEANTECH_ARCHITECTS',
        name: 'Future Cleantech Architects',
        summary:
            'A European think tank pushing innovation for the hard sectors — cement, steel, aviation — into EU policy.',
        causes: [CLIMATE],
        country: 'DE',
        scope: 'European Union',
        website: 'https://fcarchitects.org/',
        signals: [
            {
                evaluator: GIVING_GREEN,
                label: 'Top Climate Nonprofit',
                url: GIVING_GREEN_TOP,
                year: 2026,
            },
            {
                evaluator: DONEER_EFFECTIEF,
                label: 'Jury top pick · climate',
                url: DONEER_EFFECTIEF_LIST,
                year: 2026,
            },
        ],
        reporting:
            'Reports via Giving Green’s published spotlight; German charitable (gGmbH) status.',
    },
    {
        key: 'OPPORTUNITY_GREEN',
        name: 'Opportunity Green',
        summary: 'Legal and economic advocacy to cut aviation and shipping emissions.',
        causes: [CLIMATE],
        country: 'GB',
        scope: 'Global',
        website: 'https://www.opportunitygreen.org/',
        signals: [
            {
                evaluator: GIVING_GREEN,
                label: 'Top Climate Nonprofit',
                url: GIVING_GREEN_TOP,
                year: 2026,
            },
            {
                evaluator: DONEER_EFFECTIEF,
                label: 'Recommended',
                url: DONEER_EFFECTIEF_LIST,
                year: 2026,
            },
        ],
        reporting: 'Audited annual report and financial statements each year.',
    },

    // ── Animals ──────────────────────────────────────────────────────────────
    {
        key: 'THE_HUMANE_LEAGUE',
        name: 'The Humane League',
        summary:
            'Corporate campaigns that move the largest food companies to cage-free and better broiler welfare.',
        causes: [ANIMALS],
        country: 'US',
        scope: 'Global',
        website: 'https://thehumaneleague.org/',
        signals: [
            {
                evaluator: ANIMAL_CHARITY_EVALUATORS,
                label: 'Recommended Charity',
                url: ACE_RECOMMENDED,
                year: 2025,
            },
            {
                evaluator: DONEER_EFFECTIEF,
                label: 'Top 10',
                url: DONEER_EFFECTIEF_LIST,
                year: 2026,
            },
            {
                evaluator: CHARITY_NAVIGATOR,
                label: '4-star',
                url: 'https://www.charitynavigator.org/ein/043817491',
                year: 2026,
            },
        ],
        reporting:
            'Annual report with hens spared and the share of corporate commitments actually met on time.',
    },
    {
        key: 'ANIMAL_WELFARE_OBSERVATORY',
        name: 'Animal Welfare Observatory',
        summary:
            'Corporate and EU policy advocacy for hens, broilers, fish and shrimp — Europe’s newest evaluator-recommended pick.',
        causes: [ANIMALS],
        country: 'ES',
        scope: 'Spain & European Union',
        website: 'https://animalwelfareobservatory.org/',
        signals: [
            {
                evaluator: ANIMAL_CHARITY_EVALUATORS,
                label: 'Recommended Charity',
                url: 'https://animalcharityevaluators.org/charity-review/animal-welfare-observatory/',
                year: 2025,
            },
            {
                evaluator: DONEER_EFFECTIEF,
                label: 'Jury top pick · animals',
                url: DONEER_EFFECTIEF_LIST,
                year: 2026,
            },
        ],
        reporting: 'Annual impact & accountability report with full financials.',
    },

    // ── Close to home (NL) ───────────────────────────────────────────────────
    {
        key: 'VOEDSELBANKEN_NEDERLAND',
        name: 'Voedselbanken Nederland',
        summary:
            'The umbrella of Dutch food banks, redistributing surplus food to households living in poverty.',
        causes: [COMMUNITY],
        country: 'NL',
        scope: 'Netherlands',
        website: 'https://voedselbankennederland.nl/',
        signals: [
            {
                evaluator: CBF,
                label: 'Erkend Goed Doel',
                url: 'https://cbf.nl/organisaties/voedselbanken-nederland',
                year: 2026,
            },
            {
                evaluator: ANBI,
                label: 'ANBI · 95% to purpose',
                url: 'https://voedselbankennederland.nl/voedselbanken-nederland-publiceert-jaarcijfers/',
                year: 2025,
            },
        ],
        reporting:
            'Annual report plus a public “facts & figures” page: people helped, banks, products moved.',
    },

    // ── Emergency ────────────────────────────────────────────────────────────
    {
        key: 'STICHTING_VLUCHTELING',
        name: 'Stichting Vluchteling',
        summary:
            'Rapid humanitarian aid to refugees and displaced people through local partners, with a preference for cash.',
        causes: [EMERGENCY],
        country: 'NL',
        scope: 'Global',
        website: 'https://www.vluchteling.nl/',
        signals: [
            {
                evaluator: CBF,
                label: 'Erkend Goed Doel',
                url: 'https://cbf.nl/organisaties/stichting-vluchteling',
                year: 2026,
            },
            {
                evaluator: ANBI,
                label: 'ANBI',
                url: 'https://www.vluchteling.nl/over-ons/onze-impact/jaarverslag',
                year: 2026,
            },
        ],
        reporting:
            'Annual and financial reports every year — people reached, programmes, countries — checked through the CBF passport.',
    },

    // ── Meta: one Dutch door to the evidence-based picks ─────────────────────
    {
        key: 'DONEER_EFFECTIEF',
        name: 'Doneer Effectief',
        summary:
            'A Dutch platform that passes gifts through, in full, to the evaluator-backed organisations above — with Dutch tax deduction.',
        causes: [GLOBAL_HEALTH, POVERTY, CLIMATE, ANIMALS],
        country: 'NL',
        scope: 'Global · from the Netherlands',
        website: 'https://doneereffectief.nl/',
        signals: [
            {
                evaluator: ANBI,
                label: 'ANBI · 100% pass-through',
                url: 'https://doneereffectief.nl/beste-goede-doelen/',
                year: 2026,
            },
        ],
        reporting:
            'Audited yearly accounts; quarterly allocations published with an impact estimate per grant.',
    },
];
