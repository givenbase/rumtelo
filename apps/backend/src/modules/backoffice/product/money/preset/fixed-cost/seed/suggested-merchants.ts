/**
 * Paid-to merchant keys per fixed-cost bill preset.
 * Stored on FixedCostPreset.suggestedMerchantKeys (ordered chip list).
 * Empty = free text / Other only — do not dump the whole category.
 */
export const SUGGESTED_MERCHANTS_BY_PRESET: Readonly<Record<string, readonly string[]>> = {
    // Housing
    RENT: ['VESTIA', 'YOMERE', 'ROCHDALE', 'EIGEN_HAARD', 'PORTAAL', 'DUWO', 'SSH'],
    STUDENT_HOUSING: ['DUWO', 'SSH', 'VESTIA', 'YOMERE', 'ROCHDALE', 'EIGEN_HAARD', 'PORTAAL'],
    ROOM_RENT: ['KAMERNET', 'DUWO', 'SSH'],
    MORTGAGE: ['ING', 'ABN_AMRO', 'RABOBANK', 'ASN_BANK', 'TRIODOS'],
    HOA_FEES: [],
    GROUND_LEASE: [],
    STORAGE_UNIT: ['SHURGARD'],
    SECOND_HOME: [],

    // Utilities
    ENERGY: [
        'VATTENFALL',
        'ENECO',
        'ESSENT',
        'GREENCHOICE',
        'BUDGET_THUIS',
        'OXXIO',
        'VANDEBRON',
        'ENGIE',
    ],
    ELECTRICITY: [
        'VATTENFALL',
        'ENECO',
        'ESSENT',
        'GREENCHOICE',
        'BUDGET_THUIS',
        'OXXIO',
        'VANDEBRON',
        'ENGIE',
    ],
    GAS: [
        'VATTENFALL',
        'ENECO',
        'ESSENT',
        'GREENCHOICE',
        'BUDGET_THUIS',
        'OXXIO',
        'VANDEBRON',
        'ENGIE',
    ],
    DISTRICT_HEATING: ['VATTENFALL', 'ENECO', 'ESSENT'],
    WATER: ['WATERNET'],
    SEWER: ['WATERNET'],
    WASTE_COLLECTION: [],

    // Insurance
    HEALTH_INSURANCE: ['ZILVEREN_KRUIS', 'VGZ', 'CZ', 'MENZIS', 'ONVZ', 'IZA', 'JUST', 'DITZO'],
    HEALTH_INSURANCE_SUPPLEMENT: [
        'ZILVEREN_KRUIS',
        'VGZ',
        'CZ',
        'MENZIS',
        'ONVZ',
        'ZORG_EN_ZEKERHEID',
        'SALLAND',
    ],
    DENTAL_INSURANCE: ['ZILVEREN_KRUIS', 'VGZ', 'CZ', 'MENZIS', 'ONVZ'],
    LIABILITY_INSURANCE: [
        'CENTRAAL_BEHEER',
        'INTERPOLIS',
        'OHRA',
        'FBTO',
        'INSHARED',
        'UNIVE',
        'LEMONADE',
    ],
    HOME_CONTENTS: ['CENTRAAL_BEHEER', 'INTERPOLIS', 'OHRA', 'FBTO', 'INSHARED', 'LEMONADE', 'ASR'],
    BUILDING_INSURANCE: ['CENTRAAL_BEHEER', 'INTERPOLIS', 'OHRA', 'FBTO', 'ASR', 'NN', 'ALLIANZ'],
    LIFE_INSURANCE: ['NN', 'AEGON', 'ASR', 'ALLIANZ', 'CENTRAAL_BEHEER'],
    DISABILITY_INSURANCE: ['NN', 'AEGON', 'ASR', 'ALLIANZ', 'CENTRAAL_BEHEER', 'DE_GOUDSE'],
    CAR_INSURANCE: [
        'ANWB_VERZEKEREN',
        'UNIGARANT',
        'OHRA',
        'FBTO',
        'INTERPOLIS',
        'INSHARED',
        'BOVEMIJ',
        'ALLIANZ',
    ],
    TRAVEL_INSURANCE: ['ANWB_VERZEKEREN', 'UNIGARANT', 'ALLIANZ', 'OHRA', 'HEMA_VERZEKERINGEN'],
    PET_INSURANCE: ['PETPLAN', 'TIPIQ', 'HEMA_VERZEKERINGEN'],
    LEGAL_INSURANCE: ['ARAG', 'DAS', 'DE_GOUDSE', 'ASR', 'UNIVE', 'CENTRAAL_BEHEER'],

    // Transport
    TRANSIT_PASS: ['NS', 'GVB', 'RET'],
    STUDENT_TRANSIT: ['NS', 'GVB', 'RET'],
    BIKE_LEASE: ['SWAPFIETS'],
    CAR_LEASE: ['LEASEPLAN', 'ALPHERA'],
    PARKING_PERMIT: ['Q_PARK', 'PARKMOBILE', 'YELLOWBRICK_FINE'],
    PARKING_SUBSCRIPTION: ['Q_PARK', 'PARKMOBILE', 'YELLOWBRICK_FINE'],
    ROAD_TAX: ['BELASTINGDIENST', 'RDW'],
    FUEL_CARD: ['SHELL', 'BP', 'TOTALENERGIES'],
    TOLL_SUBSCRIPTION: [],
    EV_CHARGING: ['ALLEGO', 'SHELL', 'BP', 'TOTALENERGIES'],

    // Subscriptions
    INTERNET: ['KPN', 'ZIGGO', 'ODIDO', 'VODAFONE'],
    MOBILE_PHONE: ['KPN', 'ODIDO', 'VODAFONE'],
    MOBILE_PHONE_PARTNER: ['KPN', 'ODIDO', 'VODAFONE'],
    LANDLINE: ['KPN', 'ZIGGO', 'ODIDO'],
    CLOUD_STORAGE: ['DROPBOX', 'GOOGLE', 'APPLE', 'MICROSOFT'],
    SOFTWARE_SUITE: ['MICROSOFT', 'ADOBE', 'APPLE', 'GOOGLE'],
    NEWS_SUBSCRIPTION: ['VOLKSKRANT', 'NRC', 'AD'],
    VPN: ['NORDVPN', 'PROTON_VPN', 'MULLVAD', 'SURFSHARK', 'EXPRESSVPN', 'CYBERGHOST'],

    // Groceries
    MEAL_KIT: ['HELLOFRESH', 'MARLEY_SPOON', 'FOODBAG'],

    // Media
    STREAMING_VIDEO: [
        'NETFLIX',
        'DISNEY_PLUS',
        'VIAPLAY',
        'PRIME_VIDEO',
        'YOUTUBE_PREMIUM',
        'VIDEOLAND',
        'MAX',
    ],
    STREAMING_MUSIC: ['SPOTIFY', 'YOUTUBE_PREMIUM', 'APPLE'],
    STREAMING_BUNDLE: ['PRIME_VIDEO', 'DISNEY_PLUS', 'VIAPLAY', 'APPLE'],
    GAMING_SUBSCRIPTION: ['PLAYSTATION', 'XBOX', 'NINTENDO', 'STEAM', 'TWITCH'],
    DATING_APP: ['TINDER', 'BUMBLE', 'HINGE'],

    // Taxes
    MUNICIPAL_TAX: [],
    PROPERTY_TAX: [],
    WATER_BOARD_TAX: [],
    WASTE_TAX: [],
    TV_LICENSE: [],

    // Family
    CHILDCARE: ['PARTOU', 'SMALLSTEPS'],
    AFTER_SCHOOL_CARE: ['PARTOU', 'SMALLSTEPS'],
    BABYSITTER_RETAINER: [],
    SCHOOL_FEES: [],
    SCHOOL_LUNCH: [],
    CHILD_SUPPORT: [],
    ALIMONY: [],
    CLEANING_SERVICE: [],
    LAUNDRY_SERVICE: [],
    NANNY: [],

    // Medical / pharmacy / therapy
    HOME_CARE: ['MEDIQ', 'CAK'],
    MEDICAL_ALARM: [],
    CARE_CONTRIBUTION: ['CAK'],
    MEDICATION_PLAN: ['APOTHEEK', 'MEDIQ'],
    PHYSIO_MEMBERSHIP: [],
    MENTAL_HEALTH: ['OPENUP'],

    // Pets
    PET_FOOD_PLAN: ['ZOO_PLUS', 'PETSPLANET', 'MAXI_ZOO', 'FRESSNAPF', 'AVI', 'WELKOOP'],
    VET_PLAN: ['ANICURA', 'IVC_EVIDENSIA'],
    PET_DAYCARE: [],

    // Banking
    BANK_FEE: [
        'ING',
        'ABN_AMRO',
        'RABOBANK',
        'BUNQ',
        'REVOLUT',
        'N26',
        'TRIODOS',
        'ASN_BANK',
        'SNS',
        'KNAB',
    ],
    CREDIT_CARD_FEE: ['ING', 'ABN_AMRO', 'RABOBANK', 'BUNQ', 'REVOLUT', 'N26'],
    INVESTMENT_PLATFORM_FEE: [
        'DEGIRO',
        'MEESMAN',
        'BRAND_NEW_DAY',
        'PEAKS',
        'BUX',
        'TRADING_212',
        'SAXO',
        'INTERACTIVE_BROKERS',
    ],

    // Debt
    CAR_LOAN_PAYMENT: ['ING', 'ABN_AMRO', 'RABOBANK', 'ASN_BANK'],
    STUDENT_LOAN_PAYMENT: ['DUO'],
    PERSONAL_LOAN_PAYMENT: ['ING', 'ABN_AMRO', 'RABOBANK', 'KNAB'],
    CREDIT_CARD_PAYMENT: ['ING', 'ABN_AMRO', 'RABOBANK', 'BUNQ', 'REVOLUT'],
    MORTGAGE_EXTRA: ['ING', 'ABN_AMRO', 'RABOBANK', 'ASN_BANK', 'TRIODOS'],

    // Education
    TUITION: ['STUDIELINK', 'UNIVERSITEIT_VAN_AMSTERDAM', 'OPEN_UNIVERSITEIT', 'NTI', 'LOI'],
    STUDENT_UNION: [],
    ONLINE_COURSE: ['UDEMY', 'COURSERA', 'LINKEDIN_LEARNING', 'SKILLSHARE', 'MASTERCLASS'],
    COACHING: [],

    // Sport / hobbies
    GYM: ['BASIC_FIT', 'SPORTCITY', 'FIT_FOR_FREE', 'TRAINMORE', 'ORANJE_FITNESS', 'CLUBSPORTIVE'],
    SPORTS_CLUB: [],
    HOBBY_MEMBERSHIP: [],

    // Give — Coach owns org-backed charities; keep merchant-only payees for chips / matching
    CHARITY: ['RODE_KRUIS', 'ARTSEN_ZONDER_GRENZEN', 'UNICEF', 'KWF'],
    CHURCH_TITHE: [],
    SPONSORSHIP: [],
    EFFECTIVE_GIVING: [],
    FOOD_BANK: [],
    EMERGENCY_RELIEF: ['GIRO555', 'RODE_KRUIS', 'ARTSEN_ZONDER_GRENZEN'],
    HELPING_SOMEONE: [],

    OTHER: [],
};
