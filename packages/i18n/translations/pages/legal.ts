/** Legal pages — terms, privacy, data processing. */
const legal = {
    common: {
        eyebrow: 'Legal',
        last_updated: 'Last updated · {date}',
        questions: 'Questions?',
        back_home: 'Back to Rumtelo',
        start_free: 'Start free',
        sign_in: 'Sign in',
    },
    terms: {
        title: 'Terms of Service',
        updated: '10 September 2026',
        intro: 'By creating an account or using Rumtelo, you agree to these terms. If you do not agree, do not use the service.',
        sections: {
            what: {
                title: 'What Rumtelo is',
                body: 'Rumtelo is a personal overview and coach for money, growth, energy and soul. It is education and tooling — not a bank, broker, or licensed financial adviser. Suggestions are not personal investment advice.',
            },
            account: {
                title: 'Your account',
                items: [
                    'You must provide accurate registration details and keep your login safe.',
                    'You are responsible for activity under your account.',
                    'Household members you invite share access to that household’s data.',
                ],
            },
            use: {
                title: 'Acceptable use',
                body: 'Use Rumtelo lawfully. Do not attempt to break security, scrape the service, abuse other users, or reverse-engineer the product beyond what the law allows.',
            },
            billing: {
                title: 'Plans and billing',
                body: 'Basic may be free. Paid plans (Plus, Max) renew until cancelled. Prices include applicable VAT where shown. Cancel anytime; content you entered stays readable unless you delete the account.',
            },
            ip: {
                title: 'Intellectual property',
                body: 'Rumtelo’s software, brand and design belong to us. Your household data belongs to you. Books and methods we reference remain the property of their authors — Rumtelo is independent and not affiliated with or endorsed by them.',
            },
            availability: {
                title: 'Availability',
                body: 'We aim for a reliable service but do not guarantee uninterrupted access. Features marked “coming” (e.g. live bank sync, devices) may ship later or change.',
            },
            liability: {
                title: 'Liability',
                body: 'To the extent allowed by Dutch and EU law, Rumtelo is provided “as is.” We are not liable for decisions you make with your money based on the product. Nothing in these terms limits liability that cannot be limited by law.',
            },
            law: {
                title: 'Governing law',
                body: 'These terms are governed by the laws of the Netherlands. Disputes are subject to the courts of Amsterdam, without prejudice to mandatory consumer protections.',
            },
            contact: {
                title: 'Contact',
            },
        },
    },
    privacy: {
        title: 'Privacy Policy',
        updated: '10 September 2026',
        intro: 'Rumtelo (“we”, “us”) is built in Amsterdam and hosts data in the EU. This policy explains what we collect, why, and your rights under the GDPR.',
        sections: {
            who: {
                title: 'Who we are',
                body: 'Rumtelo is operated from Amsterdam, the Netherlands. Contact: support@rumtelo.com.',
            },
            collect: {
                title: 'What we collect',
                items: [
                    'Account details you provide (name, email, password hash).',
                    'Household money data you enter or import (jars, transactions, goals, debt, and related product data).',
                    'Optional energy and soul practice data you choose to log (sleep, training, intention, and similar).',
                    'Basic technical logs needed to keep the service secure and working.',
                ],
            },
            use: {
                title: 'How we use it',
                body: 'To run your account, show your overview and Coach tips, improve the product, and meet legal obligations. We do not sell your personal data.',
            },
            bank: {
                title: 'Bank data',
                body: 'Bank connections are optional. When live bank sync is available, access is read-only via a PSD2-licensed provider, and only after you connect it yourself. Statement import is always under your control.',
            },
            hosting: {
                title: 'Where it lives',
                body: 'Data is hosted on EU servers (Amsterdam region), encrypted in transit (TLS) and at rest. Processors we use act under data-processing terms.',
            },
            rights: {
                title: 'Your rights',
                body: 'You can access, correct, export, or delete your data. Cancel a paid plan and your jars, transactions and goals stay readable unless you ask us to delete the account. To exercise rights, email support@rumtelo.com.',
            },
            retention: {
                title: 'Retention',
                body: 'We keep account and household data while your account is active, and for a limited period after deletion where the law requires (e.g. billing records).',
            },
            changes: {
                title: 'Changes',
                body: 'We may update this policy. Material changes will be noted on this page with a new “Last updated” date.',
            },
        },
    },
    data_processing: {
        title: 'Data Processing',
        updated: '10 September 2026',
        intro_prefix:
            'This page summarises how Rumtelo processes personal data under the GDPR. For the full picture, also read our',
        privacy_link: 'Privacy Policy',
        sections: {
            roles: {
                title: 'Roles',
                body: 'For your Rumtelo account and household data, Rumtelo acts as the data controller. When we use infrastructure or payment providers, they act as processors under contract.',
            },
            purposes: {
                title: 'Purposes and legal bases',
                items: {
                    contract:
                        'Contract — create and run your account, show jars, Coach tips, and product features you use.',
                    interest:
                        'Legitimate interest — security, fraud prevention, product improvement (with safeguards).',
                    consent: 'Consent — optional bank connect or marketing where required.',
                    obligation: 'Legal obligation — tax and accounting records for paid plans.',
                },
            },
            categories: {
                title: 'Categories of data',
                body: 'Identity and contact data; authentication credentials (hashed); household financial and practice data you enter or import; technical logs.',
            },
            processors: {
                title: 'Processors (typical)',
                items: [
                    'EU cloud hosting (application, database, backups) — Amsterdam region.',
                    'Email delivery for verification and account messages.',
                    'Payment processor for paid plans (card details never stored by Rumtelo).',
                    'Optional PSD2/AIS provider for live bank sync when enabled — read-only, after you connect.',
                ],
            },
            transfers: {
                title: 'International transfers',
                body: 'We prefer EU processing. If a processor transfers data outside the EEA, we require appropriate safeguards (e.g. Standard Contractual Clauses).',
            },
            subprocessors: {
                title: 'Subprocessors and changes',
                body: 'Processor list may change as the product grows. Material changes that affect how your data is processed will be reflected here or in the Privacy Policy.',
            },
            contact: {
                title: 'Contact / DPO',
                body: 'Privacy requests: support@rumtelo.com. You may also lodge a complaint with the Dutch Autoriteit Persoonsgegevens.',
            },
        },
    },
} as const;

export default legal;
