/** Public support — hub, legal index, contact, spaarpotjes guide. */
const support = {
    common: {
        eyebrow: 'Support',
        back_home: 'Back to Rumtelo',
        start_free: 'Start free',
        sign_in: 'Sign in',
    },
    hub: {
        title: 'Support',
        description:
            'Guides, legal documents, and how to reach us. Rumtelo is operated from Amsterdam — we reply by email.',
        cards: {
            spaarpotjes: {
                title: 'Spaarpotjes & jars',
                body: 'One bank, six jars: how main account and sub-savings work together.',
                cta: 'Read the guide',
            },
            legal: {
                title: 'Legal',
                body: 'Privacy, terms, cookies, and how we process your data.',
                cta: 'View documents',
            },
            contact: {
                title: 'Contact',
                body: 'Account help, privacy requests, or press.',
                cta: 'Get in touch',
            },
        },
    },
    spaarpotjes: {
        title: 'Spaarpotjes and the six jars',
        description:
            'Short guide for households that keep one main bank account and split the rest into spaarpotjes (sub-savings).',
        sections: {
            what: {
                title: 'What is a spaarpotje?',
                body: 'A spaarpotje is a labelled pot at your bank — often called a “savings pot”, “space”, or “sub-savings” — still under the same login as your main account. Money does not leave the bank; you just decide which pot holds which purpose.',
            },
            jars: {
                title: 'How Rumtelo maps to that',
                body: 'Necessity is your hoofdrekening (main account): salary and bills land there. The other five jars — Freedom, Long-term Savings, Education, Play, Give — are spaarpotjes. Rumtelo tracks the split; your bank holds the euros.',
            },
            banks: {
                title: 'What your bank usually offers',
                body: 'Most Dutch and many EU banks let you open several savings pots under one account. Name them after the jars (or keep bank names and link them in Rumtelo). You do not need six separate bank accounts.',
            },
            rumtelo: {
                title: 'What Rumtelo does not do',
                body: 'We never move money between pots or accounts. You transfer at the bank (or later with read-only bank sync). Rumtelo only helps you plan the split and see where each euro is meant to go.',
            },
        },
        back_support: 'Back to support',
        start_cta: 'Start free',
    },
    legal: {
        title: 'Legal',
        description:
            'Policies for using Rumtelo. Written for a household overview — not banking or investment advice — and aligned with GDPR, EU consumer rules, and US state privacy notices.',
        read_document: 'Read document',
        footer_kicker: 'Need something else?',
        footer_contact: 'Contact us',
        documents: {
            privacy: {
                title: 'Privacy Policy',
                short: 'What we collect, why, GDPR and US privacy rights.',
            },
            terms: {
                title: 'Terms of Service',
                short: 'Accounts, billing, cooling-off, liability, and governing law.',
            },
            cookies: {
                title: 'Cookie Policy',
                short: 'Necessary cookies, storage, and how you can control them.',
            },
            data_processing: {
                title: 'Data Processing',
                short: 'Roles, legal bases, named processors, and EU transfers.',
            },
            company: {
                title: 'Company information',
                short: 'Who operates Rumtelo, contact points, and authorities.',
            },
        },
    },
    contact: {
        title: 'Contact',
        description:
            'We are a small team in Amsterdam. Send a message below — we reply by email, usually within a few business days.',
        expect_kicker: 'What to expect',
        expect: {
            response: {
                title: 'Email reply',
                body: 'We read every message and reply as soon as we can, usually within a few business days.',
            },
            privacy: {
                title: 'Privacy requests',
                body: 'Access, correction, export, or deletion — use the form with topic “Privacy” and the email on your account.',
            },
            legal: {
                title: 'Policies first',
                body: 'Many answers live in Privacy and Terms. Check those before you write.',
            },
        },
        form_kicker: 'Send a message',
        form: {
            name: 'Name',
            name_placeholder: 'Your name',
            email: 'Email',
            email_placeholder: 'you@example.com',
            phone: 'Phone',
            topic: 'Topic',
            message: 'Message',
            message_placeholder: 'How can we help?',
            submit: 'Send message',
            submitting: 'Sending…',
            success_title: 'Message sent',
            success_body:
                'Thanks — we received your message and will reply to the email you provided.',
            send_another: 'Send another message',
            topics: {
                support: 'Product support',
                press: 'Press & partnerships',
                privacy: 'Privacy request',
                other: 'Other',
            },
        },
        channels_kicker: 'Direct email',
        channels: {
            support: {
                title: 'Product support',
                body: 'Account, household, billing, or product questions.',
                email: 'support@rumtelo.com',
                cta: 'Email support',
            },
            press: {
                title: 'Press & partnerships',
                body: 'Media, partnerships, and general company inquiries.',
                email: 'info@rumtelo.com',
                cta: 'Email info',
            },
        },
        legal_kicker: 'Legal documents',
        legal_cta: 'Browse legal',
        location: 'Amsterdam, the Netherlands',
    },
} as const;

export default support;
