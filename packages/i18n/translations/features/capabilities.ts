/** Plan capability catalog — mirrors CAPABILITY_CATALOG copy for UI. */
const capabilities = {
    'home-overview': {
        name: 'Overview',
        description: 'Home overview and daily start.',
    },
    'home-coach': {
        name: 'Coach',
        description: 'Suggestions across products — week check, month score, and next moves.',
    },
    'home-why': {
        name: 'Why',
        description: 'Why this practice matters.',
    },
    'money-overview': {
        name: 'Overview',
        description: 'Money overview and jar pulse.',
    },
    'money-jars': {
        name: 'Jars',
        description: 'The six jars — core money model.',
    },
    'money-spending': {
        name: 'Transactions',
        description: 'Manual in/out ledger and sorting.',
    },
    'money-fixed-costs': {
        name: 'Fixed costs',
        description: 'Recurring fixed costs.',
    },
    'money-debt': {
        name: 'Debt',
        description: 'Debt plan with interest, payoff order, and freedom date.',
    },
    'money-bank': {
        name: 'Bank',
        description: 'Connect bank accounts via PSD2.',
    },
    'money-import': {
        name: 'Import',
        description: 'Upload bank statements (CSV import).',
    },
    'growth-overview': {
        name: 'Overview',
        description: 'Growth overview.',
    },
    'growth-goals': {
        name: 'Goals',
        description: 'Goals with a date, jar, and progress.',
    },
    'growth-income': {
        name: 'Income',
        description: 'Income sources, monthly net, and earning methods.',
    },
    'growth-learn': {
        name: 'Learn',
        description:
            'Skills to work, and books, courses, seminars, and events we recommend — not host.',
    },
    'growth-net-worth': {
        name: 'Net worth',
        description: 'Net worth, returns, and your freedom number.',
    },
    'energy-overview': {
        name: 'Overview',
        description: 'Energy overview.',
    },
    'energy-sleep': {
        name: 'Sleep',
        description: 'Sleep tracking.',
    },
    'energy-week': {
        name: 'Week',
        description: 'Divide 168 hours — sleep, training, and food.',
    },
    'energy-training': {
        name: 'Training',
        description: 'Training sessions and load.',
    },
    'energy-food': {
        name: 'Food',
        description: 'Food and fuel logging.',
    },
    'soul-overview': {
        name: 'Overview',
        description: 'Soul overview.',
    },
    'soul-stillness': {
        name: 'Stillness',
        description: 'Stillness practice and presence.',
    },
    'soul-gratitude': {
        name: 'Gratitude',
        description: 'Gratitude practice.',
    },
    'soul-giving': {
        name: 'Giving',
        description: 'Why the Give jar exists, where it goes, and how to choose well.',
    },
    'soul-intent': {
        name: 'Intent',
        description: 'Weekly intent.',
    },
    'soul-centres': {
        name: 'Centres',
        description: 'The seven centres and where energy gets stuck.',
    },
    'platform-invite': {
        name: 'Invite',
        description: 'Invite a partner, family, or friend to the household.',
    },
} as const;

export default capabilities;
