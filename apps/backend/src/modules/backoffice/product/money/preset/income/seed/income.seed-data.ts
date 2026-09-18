import { Cadence, IncomeKind } from '@rumtelo/contracts';

const monthly = Cadence.MONTHLY;
const quarterly = Cadence.QUARTERLY;
const yearly = Cadence.YEARLY;
const weekly = Cadence.WEEKLY;

/**
 * English income-name suggestions for create forms.
 * Multiple presets can share the same IncomeKind — kind drives analytics + picker groups; name is what the user sees.
 */
export const INCOME_SOURCE_PRESET_SEED = [
    // Employment / salary
    {
        key: 'SALARY',
        name: 'Salary',
        kind: IncomeKind.SALARY,
        cadence: monthly,
        icon: '💼',
    },
    {
        key: 'PARTNER_SALARY',
        name: 'Partner salary',
        kind: IncomeKind.SALARY,
        cadence: monthly,
        icon: '👥',
    },
    {
        key: 'PART_TIME_JOB',
        name: 'Part-time job',
        kind: IncomeKind.SALARY,
        cadence: monthly,
        icon: '🕒',
    },
    {
        key: 'SIDE_JOB',
        name: 'Side job',
        kind: IncomeKind.SALARY,
        cadence: monthly,
        icon: '🧩',
    },
    {
        key: 'INTERNSHIP',
        name: 'Internship',
        kind: IncomeKind.SALARY,
        cadence: monthly,
        icon: '🎓',
    },
    {
        key: 'HOLIDAY_PAY',
        name: 'Holiday pay',
        kind: IncomeKind.SALARY,
        cadence: yearly,
        icon: '🏖️',
    },
    {
        key: 'THIRTEENTH_MONTH',
        name: '13th month',
        kind: IncomeKind.SALARY,
        cadence: yearly,
        icon: '📅',
    },
    {
        key: 'BONUS',
        name: 'Bonus',
        kind: IncomeKind.SALARY,
        cadence: yearly,
        icon: '🎉',
    },
    {
        key: 'OVERTIME',
        name: 'Overtime',
        kind: IncomeKind.SALARY,
        cadence: monthly,
        icon: '⏱️',
    },
    {
        key: 'COMMISSION',
        name: 'Commission',
        kind: IncomeKind.SALARY,
        cadence: monthly,
        icon: '📈',
    },

    // Freelance / self-employed
    {
        key: 'FREELANCE',
        name: 'Freelance',
        kind: IncomeKind.FREELANCE,
        cadence: monthly,
        icon: '🛠️',
    },
    {
        key: 'SELF_EMPLOYED',
        name: 'Self-employed income',
        kind: IncomeKind.FREELANCE,
        cadence: monthly,
        icon: '🏪',
    },
    {
        key: 'CONTRACTING',
        name: 'Contracting',
        kind: IncomeKind.FREELANCE,
        cadence: monthly,
        icon: '📝',
    },
    {
        key: 'CONSULTING',
        name: 'Consulting',
        kind: IncomeKind.FREELANCE,
        cadence: monthly,
        icon: '💡',
    },
    {
        key: 'GIG_WORK',
        name: 'Gig work',
        kind: IncomeKind.FREELANCE,
        cadence: weekly,
        icon: '🛵',
    },
    {
        key: 'CREATOR_INCOME',
        name: 'Creator income',
        kind: IncomeKind.FREELANCE,
        cadence: monthly,
        icon: '🎬',
    },
    {
        key: 'BUSINESS_PROFIT',
        name: 'Business profit',
        kind: IncomeKind.FREELANCE,
        cadence: monthly,
        icon: '🏢',
    },

    // Benefits / government / student / elderly
    {
        key: 'BENEFIT',
        name: 'Benefit',
        kind: IncomeKind.BENEFIT,
        cadence: monthly,
        icon: '🏛️',
    },
    {
        key: 'UNEMPLOYMENT_BENEFIT',
        name: 'Unemployment benefit',
        kind: IncomeKind.BENEFIT,
        cadence: monthly,
        icon: '🛟',
    },
    {
        key: 'DISABILITY_BENEFIT',
        name: 'Disability benefit',
        kind: IncomeKind.BENEFIT,
        cadence: monthly,
        icon: '♿',
    },
    {
        key: 'STUDENT_GRANT',
        name: 'Student grant',
        kind: IncomeKind.BENEFIT,
        cadence: monthly,
        icon: '📚',
    },
    {
        key: 'STUDENT_LOAN_INCOME',
        name: 'Student loan (incoming)',
        kind: IncomeKind.BENEFIT,
        cadence: monthly,
        icon: '🎓',
    },
    {
        key: 'CHILD_BENEFIT',
        name: 'Child benefit',
        kind: IncomeKind.BENEFIT,
        cadence: monthly,
        icon: '👶',
    },
    {
        key: 'HOUSING_ALLOWANCE',
        name: 'Housing allowance',
        kind: IncomeKind.BENEFIT,
        cadence: monthly,
        icon: '🏠',
    },
    {
        key: 'CARE_ALLOWANCE',
        name: 'Care allowance',
        kind: IncomeKind.BENEFIT,
        cadence: monthly,
        icon: '🫶',
    },
    {
        key: 'PENSION',
        name: 'Pension',
        kind: IncomeKind.BENEFIT,
        cadence: monthly,
        icon: '🧓',
    },
    {
        key: 'STATE_PENSION',
        name: 'State pension',
        kind: IncomeKind.BENEFIT,
        cadence: monthly,
        icon: '🏛️',
    },
    {
        key: 'COMPANY_PENSION',
        name: 'Company pension',
        kind: IncomeKind.BENEFIT,
        cadence: monthly,
        icon: '🏦',
    },

    // Rental / property
    {
        key: 'RENTAL',
        name: 'Rental income',
        kind: IncomeKind.RENTAL,
        cadence: monthly,
        icon: '🔑',
    },
    {
        key: 'ROOM_RENTAL',
        name: 'Room rental',
        kind: IncomeKind.RENTAL,
        cadence: monthly,
        icon: '🛏️',
    },
    {
        key: 'HOLIDAY_RENTAL',
        name: 'Holiday rental',
        kind: IncomeKind.RENTAL,
        cadence: monthly,
        icon: '🏡',
    },
    {
        key: 'PARKING_RENTAL',
        name: 'Parking / storage rental',
        kind: IncomeKind.RENTAL,
        cadence: monthly,
        icon: '🅿️',
    },

    // Investments
    {
        key: 'DIVIDEND',
        name: 'Dividend',
        kind: IncomeKind.DIVIDEND,
        cadence: quarterly,
        icon: '📊',
    },
    {
        key: 'INTEREST_INCOME',
        name: 'Interest income',
        kind: IncomeKind.DIVIDEND,
        cadence: monthly,
        icon: '💹',
    },
    {
        key: 'INVESTMENT_PAYOUT',
        name: 'Investment payout',
        kind: IncomeKind.DIVIDEND,
        cadence: quarterly,
        icon: '🪙',
    },
    {
        key: 'CRYPTO_INCOME',
        name: 'Crypto income',
        kind: IncomeKind.DIVIDEND,
        cadence: monthly,
        icon: '₿',
    },

    // Other common household inflows
    {
        key: 'OTHER',
        name: 'Other',
        kind: IncomeKind.OTHER,
        cadence: monthly,
        icon: '✨',
    },
    {
        key: 'ALIMONY_IN',
        name: 'Alimony (incoming)',
        kind: IncomeKind.OTHER,
        cadence: monthly,
        icon: '⚖️',
    },
    {
        key: 'CHILD_SUPPORT_IN',
        name: 'Child support (incoming)',
        kind: IncomeKind.OTHER,
        cadence: monthly,
        icon: '👨‍👩‍👧',
    },
    {
        key: 'FAMILY_SUPPORT',
        name: 'Family support',
        kind: IncomeKind.OTHER,
        cadence: monthly,
        icon: '💗',
    },
    {
        key: 'GIFT_INCOME',
        name: 'Gift / inheritance',
        kind: IncomeKind.OTHER,
        cadence: yearly,
        icon: '🎁',
    },
    {
        key: 'TAX_REFUND',
        name: 'Tax refund',
        kind: IncomeKind.OTHER,
        cadence: yearly,
        icon: '🧾',
    },
    {
        key: 'INSURANCE_PAYOUT',
        name: 'Insurance payout',
        kind: IncomeKind.OTHER,
        cadence: yearly,
        icon: '🛡️',
    },
    {
        key: 'SCHOLARSHIP',
        name: 'Scholarship',
        kind: IncomeKind.OTHER,
        cadence: monthly,
        icon: '🎖️',
    },
    {
        key: 'ROYALTIES',
        name: 'Royalties',
        kind: IncomeKind.OTHER,
        cadence: quarterly,
        icon: '🎵',
    },
    {
        key: 'REIMBURSEMENT',
        name: 'Expense reimbursement',
        kind: IncomeKind.OTHER,
        cadence: monthly,
        icon: '↩️',
    },
] as const;
