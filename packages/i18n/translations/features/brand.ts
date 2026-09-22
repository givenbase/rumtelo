/**
 * Brand voice — source of truth for taglines and auth panels.
 * Keep in sync with docs/brand/quotes.md.
 * Currency-agnostic — never lock lines to euro/dollar symbols.
 */
const brand = {
    tagline: 'Stop wondering where it went.',
    core: {
        one: 'Stop wondering where it went.',
        two: 'Money leaves. You’ll know why.',
        three: 'No more mystery spending.',
    },
    /** Website auth — sales / marketing door into the product. */
    auth_quotes_web: {
        money_picture: {
            eyebrow: 'The money picture',
            headline: 'Stop wondering where it went.',
            support: 'Money leaves. You’ll know why. No more mystery spending.',
        },
        how_it_works: {
            eyebrow: 'How it works',
            headline: 'Split first. Spend second.',
            support: 'Money. Energy. Growth. Soul. One overview.',
        },
        who_its_for: {
            eyebrow: 'Who it’s for',
            headline: 'For people doing well — and ready.',
            support: 'Don’t chase the number. Own the direction.',
        },
        life_beyond: {
            eyebrow: 'The full picture',
            headline: 'Assign the money. Protect the energy. Keep the why.',
            support: 'Not just money. Where your life goes.',
        },
    },
    /** Auth manifesto chrome — bottom strip + tablist aria (UI stays i18n-agnostic). */
    auth_manifesto: {
        brand_lines_aria: 'Brand lines',
        portals_eyebrow: 'Four portals',
        portals_line: 'Money. Growth. Energy. Soul — in balance.',
        jars_eyebrow: 'Six jars',
        jars_line: 'Paycheck in. Already assigned.',
        portals: {
            money: { name: 'Money', short: 'MONEY' },
            growth: { name: 'Growth', short: 'GROWTH' },
            energy: { name: 'Energy', short: 'ENERGY' },
            soul: { name: 'Soul', short: 'SOUL' },
        },
        jars: {
            necessity: { name: 'Necessity', short: 'NEC' },
            freedom: { name: 'Freedom', short: 'FF' },
            education: { name: 'Education', short: 'EDU' },
            savings: { name: 'Savings', short: 'LTS' },
            play: { name: 'Play', short: 'PLAY' },
            give: { name: 'Give', short: 'GIVE' },
        },
    },
    /** Application auth — pull them back into the habit. */
    auth_quotes_app: {
        money_picture: {
            eyebrow: 'Your money',
            headline: 'Know where it went. Know where it’s going.',
            support: 'Your money, assigned. Not guessed.',
        },
        how_it_works: {
            eyebrow: 'Today',
            headline: 'Paycheck in. Picture clear.',
            support: 'Assign it. Then spend it. Six jars decide.',
        },
        energy: {
            eyebrow: 'Your capacity',
            headline: 'A tired head spends. A rested head decides.',
            support: 'Stop wondering what you’re running on.',
        },
        why: {
            eyebrow: 'Keep going',
            headline: 'See the spend. See the energy. See the why.',
            support: 'Clear books. Calm head. Come back tomorrow.',
        },
    },
} as const;

export default brand;
