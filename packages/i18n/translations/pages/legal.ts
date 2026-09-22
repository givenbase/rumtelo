/** Legal pages — terms, privacy, cookies, data processing, company. */
const legal = {
    common: {
        eyebrow: 'Legal',
        last_updated: 'Last updated · {date}',
        questions: 'Questions?',
        contact_link: 'Contact us',
        legal_hub_link: 'All legal',
        back_home: 'Back to Rumtelo',
        start_free: 'Start free',
        sign_in: 'Sign in',
    },
    terms: {
        title: 'Terms of Service',
        updated: '22 September 2026',
        intro: 'These Terms of Service (“Terms”) are a binding agreement between you and the operator of Rumtelo (“Rumtelo”, “we”, “us”). By creating an account, clicking accept, or using rumtelo.com, the Rumtelo app, or related services (the “Service”), you agree to these Terms and to our Privacy Policy and Cookie Policy. If you do not agree, do not use the Service.',
        sections: {
            operator: {
                title: 'Who you contract with',
                body: 'Rumtelo is operated from Amsterdam, the Netherlands. Company identification (legal name, Chamber of Commerce number, VAT number and address when published) is on our Company information page. Contact: support@rumtelo.com.',
            },
            what: {
                title: 'What Rumtelo is — and is not',
                body: 'Rumtelo is a personal overview and educational coach for money, growth, energy and soul. It helps a household see where money goes, set goals, and review a week. It is software and education — not a regulated financial product.',
                items: [
                    'Not a bank, payment institution, e-money issuer, or custodian. We never hold your money or move it between accounts.',
                    'Not a broker, investment firm, or licensed financial adviser. Coach tips and suggestions are general education, not personal investment, tax, credit, or legal advice.',
                    'Not a medical, psychological, or wellness practitioner. Energy and soul features are optional self-logging tools, not diagnosis or treatment.',
                    'Books and methods we mention stay those authors’ property. Rumtelo is independent and is not affiliated with or endorsed by them.',
                ],
                after: 'You remain solely responsible for decisions about money, health, and life. If you need regulated advice, consult a licensed professional in your country.',
            },
            eligibility: {
                title: 'Eligibility and age',
                body: 'The Service is for natural persons who are at least 18 years old and able to form a binding contract. You must not use Rumtelo if you are under 18 or if applicable law forbids you from using it (including EU or US sanctions lists). By registering you confirm that these conditions are true.',
            },
            account: {
                title: 'Your account and household',
                items: [
                    'Provide accurate registration details (including name and email) and keep them current. Date of birth, if you give it, must be accurate.',
                    'Keep login credentials and two-factor codes confidential. You are responsible for activity under your account unless you told us of unauthorised access without delay.',
                    'A household is a shared workspace. People you invite can see that household’s jars, transactions, goals and related data. Invite only people you trust and only if you are allowed to share that data with them.',
                    'If you are invited, you must use household data only for the household’s own overview — not to copy, publish, or misuse another member’s information.',
                    'We may refuse, suspend, or close an account that is inaccurate, abusive, or creates a security or legal risk.',
                ],
            },
            use: {
                title: 'Acceptable use',
                body: 'Use the Service only for lawful, personal or household purposes. You must not:',
                items: [
                    'Break the law, infringe others’ rights, or upload unlawful, harmful, or deceptive content.',
                    'Probe, scan, or attack security; bypass access controls; or overload the Service.',
                    'Scrape, harvest, or bulk-export the Service beyond what we provide to you (for example your own export), or reverse-engineer the product except where mandatory law allows.',
                    'Use the Service to provide a competing product, to train a public model on our software or Coach output, or to send spam.',
                    'Misrepresent Rumtelo as a bank, adviser, or medical service, or use it to make automated decisions about other people (credit, hiring, insurance).',
                    'Share an account in a way that evades plan limits, except genuine household members you invite.',
                ],
            },
            content: {
                title: 'Your data and our licence to operate the Service',
                body: 'You retain ownership of the household and account data you enter or import (“Your Content”). You grant Rumtelo a limited, worldwide, non-exclusive licence to host, store, process, display, and back up Your Content solely to provide, secure, and improve the Service, and to meet the law. That licence ends when Your Content is deleted from our live systems and residual backups expire, except where we must keep a copy (for example invoices).',
                after: 'You represent that you have the right to submit Your Content — including bank statements you import and data about household members — and that it does not violate the law or these Terms.',
            },
            ip: {
                title: 'Our intellectual property',
                body: 'The Service, including software, design, brand, Coach copy, catalogs and documentation, belongs to Rumtelo or our licensors. We grant you a personal, non-transferable, non-exclusive right to use the Service during your subscription or free access, solely as we make it available. You may not copy, resell, or create derivative products from the Service except as allowed by mandatory law.',
            },
            billing: {
                title: 'Plans, prices and VAT',
                body: 'Basic may be offered free. Paid plans (for example Plus and Max) are subscriptions billed in advance, monthly or yearly, until cancelled. Prices are shown before you pay. Where VAT or similar tax applies, it is included or shown as required for your country. We charge through our payment provider (Stripe). We do not store full card numbers.',
                after: 'A free plan does not guarantee that every current feature stays free. If we introduce a charge for something you already use, we will say so in advance and you may cancel.',
            },
            withdrawal: {
                title: 'Cooling-off (EEA/UK consumers) and cancellation',
                body: 'If you are a consumer in the EEA or the United Kingdom, you usually have 14 days from the day the paid contract is concluded to withdraw, without giving a reason, under the Consumer Rights Directive (and UK equivalent).',
                items: [
                    'To withdraw, email support@rumtelo.com from your account address within 14 days, or use any withdraw/cancel control we provide. We will refund fees paid for the withdrawn contract using the same means of payment, without undue delay and within 14 days of the notice.',
                    'The Service is digital and starts when your account is created. If you ask us to start immediately and acknowledge that you lose the right of withdrawal once the service has been fully performed, EU/UK law allows that loss. For an ongoing subscription that has only partly run, we may deduct an amount in proportion to the period already provided.',
                    'After the cooling-off period, you may cancel a paid plan at any time. Cancellation takes effect at the end of the current billing period unless we say otherwise at checkout. You keep read access to content you entered unless you delete the account.',
                    'Chargebacks started in bad faith after you used the Service may lead to suspension. Talk to us first — we will fix billing errors.',
                ],
            },
            availability: {
                title: 'Availability, beta and changes',
                body: 'We aim for a reliable Service but do not guarantee uninterrupted, error-free, or complete access. Maintenance, faults, or force majeure (including failures of hosting, payment, or email providers) may interrupt the Service. Features marked “coming”, “preview”, or “beta” — including live bank sync and devices — may change, ship later, or never ship. We may change, limit, or discontinue features. If a change materially reduces a paid plan you already bought, we will give reasonable notice and you may cancel.',
            },
            third_parties: {
                title: 'Third-party services',
                body: 'Payments, email delivery, hosting, and optional bank connections are provided by third parties under their own terms. We are not responsible for those providers’ independent acts, except where the law makes us responsible. Optional bank access, when available, is read-only through a PSD2-licensed account-information provider after you connect it yourself.',
            },
            disclaimers: {
                title: 'Disclaimers',
                body: 'To the fullest extent permitted by Dutch and EU law, the Service is provided “as is” and “as available.” We do not warrant that Coach suggestions, balances, imports, or scores are complete, current, or suitable for any particular financial or health decision. Nothing in these Terms limits a warranty or conformity right that cannot be limited for consumers — including the statutory conformity of digital content and services under EU law.',
            },
            liability: {
                title: 'Liability',
                body: 'We do not exclude or limit liability that the law does not allow us to exclude: intent, wilful recklessness, death or personal injury caused by our negligence, fraud, product liability, or mandatory consumer rights.',
                items: [
                    'We are not liable for investment, spending, tax, or health decisions you make using the Service, or for losses caused by data you entered incorrectly, members you invited, or a third-party bank or payment provider.',
                    'We are not liable for indirect or consequential loss (lost profit, lost data after you declined to export, business interruption) except where mandatory law says otherwise.',
                    'Where liability may lawfully be limited, our aggregate liability for all claims arising out of the Service is limited to the fees you paid us in the 12 months before the claim (or €100 if you paid nothing), except for the non-excludable heads above.',
                    'If you use the Service as a consumer in the EEA or UK, these limits apply only to the extent they are fair and permitted. Unfair terms are not binding on you.',
                ],
            },
            indemnity: {
                title: 'Your responsibility for misuse',
                body: 'You will reimburse Rumtelo for losses, reasonable legal fees, and claims that arise from Your Content, your breach of these Terms, or your unlawful use of the Service — except to the extent we caused the loss, and except where this would be an unfair term for a consumer.',
            },
            suspend: {
                title: 'Suspension and termination',
                body: 'You may stop using the Service and delete your account at any time. We may suspend or terminate access if you materially breach these Terms, if we must do so by law, or if we discontinue the Service. On termination we will handle Your Content as described in the Privacy Policy (export on request where feasible; deletion from live systems; limited backup and legal retention). Outstanding fees remain payable unless you validly withdraw or we are at fault.',
            },
            changes: {
                title: 'Changes to these Terms',
                body: 'We may update these Terms. The new version applies from the “Last updated” date, or later if we say so. For a material change that affects paid users, we will give reasonable notice (for example email or an in-product notice). If you do not agree, stop using the Service and cancel before the change takes effect. Continued use after that date means you accept the new Terms, except where mandatory law requires a fresh agreement.',
            },
            law: {
                title: 'Governing law and disputes',
                body: 'These Terms are governed by the laws of the Netherlands, without regard to conflict-of-law rules that would apply another law — except that if you are a consumer, you also keep the mandatory protections of the country where you live.',
                after: 'Courts of Amsterdam have jurisdiction, without prejudice to your right as a consumer to bring proceedings in your place of residence, and to our right to seek interim relief where the law allows. EEA consumers may also use the EU Online Dispute Resolution platform or a notified ADR body; we are not obliged to use a particular ADR body unless the law requires it. We do not require you to waive class or jury rights where that waiver would be unlawful (including for EEA/UK consumers).',
            },
            us_terms: {
                title: 'Visitors in the United States',
                body: 'If you access the Service from the United States, you do so on your own initiative. The Service is offered from the Netherlands and is not directed at any US state as a local financial product. US state consumer and privacy laws may give you extra rights; see the Privacy Policy. To the extent a US court would apply these Terms, the disclaimers and liability caps above apply to the maximum extent permitted by that state’s law, and unenforceable parts are severed.',
            },
            miscellaneous: {
                title: 'General',
                items: [
                    'If a provision is invalid, the rest stays in force. A valid provision as close as possible to the invalid one applies where the law allows.',
                    'These Terms, plus the Privacy Policy, Cookie Policy, and any plan details shown at checkout, are the entire agreement for the Service.',
                    'You may not assign the contract without our consent. We may assign it in a reorganisation or sale of the Service, provided your consumer rights are not reduced.',
                    'We communicate in English. Translations are a convenience. If a translation conflicts with the English text, English prevails — except where mandatory consumer law of your country requires otherwise.',
                    'Failure to enforce a term is not a waiver.',
                ],
            },
            contact: {
                title: 'Contact',
                body: 'Questions about these Terms: support@rumtelo.com or the contact page. A copy of these Terms is available on this page so you can store it.',
            },
        },
    },
    privacy: {
        title: 'Privacy Policy',
        updated: '22 September 2026',
        intro: 'This Privacy Policy explains how Rumtelo (“we”, “us”) collects, uses, shares, and protects personal data when you use rumtelo.com, the Rumtelo app, and related services. It is written for the EU General Data Protection Regulation (GDPR / AVG), complementary Dutch and ePrivacy rules, UK GDPR where it still applies, and US state privacy laws (including the California CCPA/CPRA). We host household data in the EU.',
        sections: {
            who: {
                title: 'Who we are (controller)',
                body: 'The data controller is the operator of Rumtelo, established in Amsterdam, the Netherlands. Contact for privacy requests: support@rumtelo.com. Registered legal name, Chamber of Commerce (KvK) number, VAT number and postal address are listed on the Company information page when available, and will be provided on request. We have not appointed a Data Protection Officer because Article 37 GDPR does not require one at our current scale; that contact address is your privacy point of contact.',
            },
            scope: {
                title: 'Whose data and which services',
                body: 'This policy covers visitors to the website, people who create an account, and household members who are invited. It covers account, money, growth, energy and soul data you enter or import, technical logs, and billing records. It does not cover third-party websites we link to. If we act only as a processor for a future business customer, that relationship will be under a separate data-processing agreement — for household accounts, Rumtelo is the controller.',
            },
            collect: {
                title: 'What we collect',
                body: 'We collect only what we need to run a household overview and coach. Categories include:',
                items: [
                    'Identity and contact: name, email address, optional date of birth, language and locale preferences.',
                    'Account security: password hash (we never store your password in plain text), session identifiers, optional two-factor authentication status and secrets we must keep to operate 2FA, email verification status.',
                    'Household money data you enter or import: jars, transactions, goals, debts, income splits, week checks, and related product data.',
                    'Optional growth, energy and soul data you choose to log (for example goals, sleep, training, food, rest, intention). You can use Rumtelo without filling those portals.',
                    'Household membership: who you invite, their email, and their role in the household.',
                    'Billing: plan, renewal dates, Stripe customer and subscription identifiers. Card numbers are collected by Stripe, not by us.',
                    'Support messages you send us, and files you attach.',
                    'Technical data needed to keep the Service secure and working: IP address, user-agent, timestamps, approximate country derived from IP, error logs, and cookie identifiers described in the Cookie Policy.',
                    'Optional bank-related data, only if you import statements or later connect a live read-only bank feed: account metadata and transactions the provider returns. We do not receive your bank password.',
                ],
            },
            special: {
                title: 'Special-category and sensitive data',
                body: 'Energy logs (sleep, training, food, rest) and soul or intention notes can reveal health or philosophical information. Under GDPR that may be special-category data (Article 9). We process it only if you choose to use those features. By entering that data you give explicit consent for us to store and display it to you and to household members you invite, and to use it to generate Coach tips inside the product. You may stop logging and ask us to delete it. We do not use this data for advertising, scoring your credit, or inferring characteristics for third parties.',
                after: 'US “sensitive personal information” (including precise financial account data and health-related logs) is used only to provide the features you request. We do not sell it or share it for cross-context behavioural advertising.',
            },
            sources: {
                title: 'How we obtain data',
                items: [
                    'Directly from you — registration, product use, imports, support.',
                    'Automatically — cookies and server logs when you use the site or app (see Cookie Policy).',
                    'From people who invite you to a household (name and email so we can send the invite).',
                    'From processors you connect — Stripe for payment status; a PSD2/AIS provider if you enable live bank sync; email delivery reports for transactional mail.',
                ],
            },
            use: {
                title: 'Purposes and legal bases (GDPR)',
                body: 'We do not sell personal data. We use it for the following purposes. Each purpose has a GDPR legal basis (Article 6; Article 9 where special-category data is involved):',
                items: [
                    'Contract (Art. 6(1)(b)) — create and authenticate your account, run the household workspace, show jars, Coach tips and portals you use, provide export, and deliver transactional email (verify, reset, security).',
                    'Legitimate interests (Art. 6(1)(f)) — keep the Service secure, prevent abuse and fraud, debug outages, understand aggregated product usage without building advertising profiles, and establish or defend legal claims. You may object; we will stop unless we have overriding grounds.',
                    'Consent (Art. 6(1)(a) and, where needed, Art. 9(2)(a)) — optional energy/soul logs; optional bank connect; any future marketing email or non-essential cookies. You may withdraw consent at any time without affecting processing before withdrawal.',
                    'Legal obligation (Art. 6(1)(c)) — tax, accounting and consumer-law records for paid plans; respond to lawful requests from authorities.',
                ],
            },
            automated: {
                title: 'Profiling and automated decisions',
                body: 'The Coach may generate suggestions from data you already stored (for example a jar that is over the line). That is in-product assistance, not a decision that produces legal or similarly significant effects about you (GDPR Article 22). We do not use solely automated processing to grant credit, set a price uniquely for you, or refuse an account without human review where the law requires it. You can ignore Coach tips; they never move money.',
            },
            household: {
                title: 'Household sharing',
                body: 'Rumtelo is built around a household, not a single secret ledger. Members you invite can access that household’s data. You must have a lawful reason to share another adult’s data with them (for example they agreed, or you manage a shared household budget together). Do not invite minors. If you no longer want someone to see the household, remove them; we will cut their access from that point.',
            },
            bank: {
                title: 'Bank data and payments',
                body: 'Bank connections are optional and, when live, read-only via a PSD2-licensed account-information service provider after you authenticate with your bank. We never initiate payments from your bank account. Statement import is always under your control. Payment cards for Rumtelo subscriptions are processed by Stripe; we receive confirmation, plan status and identifiers, not the full card number (PAN) or CVC.',
            },
            cookies: {
                title: 'Cookies and similar technologies',
                body: 'We use strictly necessary cookies to keep you signed in, to remember a plan you picked before sign-up, and to apply your language. We do not currently run advertising or third-party analytics cookies. Details, names and durations are in the Cookie Policy. If we later add non-essential cookies, we will ask for consent first where the ePrivacy rules and Dutch Telecommunications Act require it.',
            },
            recipients: {
                title: 'Who we share data with',
                body: 'We share personal data only with:',
                items: [
                    'Household members you invite, to the extent the product requires.',
                    'Processors who act on our instructions under a contract: EU cloud hosting (Railway, Amsterdam region) for application, database and backups; Resend for transactional email; Stripe for paid-plan payments.',
                    'An optional PSD2/AIS provider if you connect a live bank feed.',
                    'Professional advisers (accountant, lawyer) under confidentiality, when needed.',
                    'Authorities if the law requires it, or if we must protect users, the Service, or our legal rights.',
                    'A buyer or successor if we reorganise or sell the Service, under continued protection and notice where the law requires.',
                ],
                after: 'We do not sell personal information and we do not share it for cross-context behavioural advertising. We do not allow processors to use your household data for their own marketing.',
            },
            transfers: {
                title: 'International transfers',
                body: 'Household product data is hosted in the European Union (Amsterdam region). Some processors are in, or can access data from, countries outside the EEA — in particular Stripe (US group companies) and Resend (email, United States). When that happens we use an adequacy decision if one exists, or Standard Contractual Clauses (and supplementary measures where needed) under GDPR Chapter V. You can ask us for more detail about the safeguards at support@rumtelo.com.',
            },
            retention: {
                title: 'How long we keep data',
                items: [
                    'Account and household product data — for as long as the account is active.',
                    'After you delete the account — we remove live personal data without undue delay, typically within 30 days, then from encrypted backups within a limited rotation window (generally up to 90 days), unless a longer legal hold applies.',
                    'Billing, invoices and tax records — up to 7 years after the year of the transaction, as Dutch fiscal retention requires.',
                    'Security and server logs — typically 30 to 90 days, longer only if needed to investigate abuse.',
                    'Support emails — as long as needed to finish the request and for a short archive, then deleted or minimised.',
                    'Consent records (for example that you accepted these policies) — for the life of the account and a reasonable period after, so we can show what you agreed to.',
                ],
            },
            security: {
                title: 'Security',
                body: 'We use TLS in transit, encryption at rest for hosted databases, hashed passwords, optional two-factor authentication, household-scoped access in the application, and least-privilege access for operators. No method is perfect; you must also keep your device and credentials safe. If a breach is likely to result in a high risk to your rights, we will notify you and the Autoriteit Persoonsgegevens as GDPR Articles 33 and 34 require.',
            },
            rights_gdpr: {
                title: 'Your rights (EEA, UK and similar)',
                body: 'Subject to legal limits, you can ask us to: access your data; correct it; erase it; restrict processing; object to legitimate-interest processing; receive a portable copy of data you provided; and withdraw consent. You can also export household data from the product where that feature exists, or email support@rumtelo.com from the address on your account. We will respond within one month (extendable by two months for complex requests, with notice). We may need to verify it is you. You may lodge a complaint with the Autoriteit Persoonsgegevens (autoriteitpersoonsgegevens.nl) or, if you live in another EEA state or the UK, with your local authority. We would rather fix the issue first.',
            },
            rights_us: {
                title: 'Your rights in the United States',
                body: 'If you are a resident of California or another US state with a comprehensive privacy law (for example Virginia, Colorado, Connecticut, Utah, Texas, Oregon), you may have the right to know/access, correct, delete, obtain a copy, opt out of “sale” or “sharing” of personal information, and limit use of sensitive personal information, and not to be discriminated against for exercising those rights. You may use an authorised agent where the statute allows, with proof of authority.',
                items: [
                    'We do not sell personal information and we do not share it for cross-context behavioural advertising, as those terms are defined in the CCPA/CPRA. A “Do Not Sell or Share” request is therefore already how we operate; email us if you want that confirmed in writing.',
                    'Categories we collect, sources, purposes, recipients and retention are described in this policy (notice at collection). In the last 12 months we have not sold or shared personal information for advertising.',
                    'To exercise US rights, email support@rumtelo.com from your account address with the subject “US privacy request” and your state. We will verify the request and respond within the statutory period (generally 45 days under CCPA, extendable as allowed).',
                    'California “Shine the Light”: we do not disclose personal information to third parties for their own direct marketing.',
                    'We do not have actual knowledge that we sell or share the personal information of consumers under 16.',
                ],
            },
            children: {
                title: 'Children',
                body: 'Rumtelo is not directed at children. You must be 18 or older. We do not knowingly collect personal data from anyone under 18 (or under 13 for COPPA). If you believe a minor created an account, email support@rumtelo.com and we will delete it.',
            },
            changes: {
                title: 'Changes to this policy',
                body: 'We may update this policy. The new “Last updated” date will appear on this page. If a change is material (new purpose, new category of recipient, or a new international transfer that affects you), we will give additional notice where required — for example email or a notice in the product. Continued use after the effective date means you have seen the update. Where a change requires fresh consent, we will ask for it.',
            },
            contact: {
                title: 'Contact and complaints',
                body: 'Privacy requests and questions: support@rumtelo.com. Company details: the Company information page. Supervisory authority in the Netherlands: Autoriteit Persoonsgegevens, PO Box 93374, 2509 AJ The Hague, https://www.autoriteitpersoonsgegevens.nl.',
            },
        },
    },
    cookies: {
        title: 'Cookie Policy',
        updated: '22 September 2026',
        intro: 'This Cookie Policy explains how Rumtelo uses cookies and similar technologies on rumtelo.com and the Rumtelo app. It supplements the Privacy Policy and meets the EU ePrivacy rules and the Dutch Telecommunications Act. Where a cookie is not strictly necessary, we will ask for consent before we set it.',
        sections: {
            what: {
                title: 'What cookies are',
                body: 'Cookies are small text files stored on your device. We also use similar technologies such as sessionStorage for the same purposes (for example remembering a plan you picked on localhost). They can be first-party (set by us) or third-party (set by someone else). We currently set first-party cookies only.',
            },
            how: {
                title: 'How we use them today',
                body: 'As of the date above, Rumtelo uses cookies only because the Service cannot work securely without them (strictly necessary). We do not set advertising cookies, social-media tracking pixels, or third-party analytics cookies. If that changes, we will update this page and request consent where required — we will not silently turn on tracking.',
            },
            necessary: {
                title: 'Strictly necessary cookies',
                body: 'These are required to provide a service you asked for. Dutch and EU rules allow them without consent. They include:',
                items: [
                    'Authentication and session cookies set by our sign-in system (Better Auth), prefixed with “rumtelo.” — they keep you signed in across rumtelo.com and app.rumtelo.com, hold a session, and support security features such as two-factor authentication. They are typically HttpOnly, Secure in production, and last for the session or a rolling signed-in period.',
                    'rumtelo_pending_plan — remembers a paid plan (Plus/Max) and billing interval you chose on the marketing site so we can continue checkout after you create an account. First-party. Typically a few days.',
                    'Locale / language preference that next-intl may store so the site stays in the language you chose (for example NEXT_LOCALE). First-party. Up to about one year.',
                    'Security attributes on those cookies (SameSite, Secure, signed values) to reduce cross-site abuse. These are not a separate commercial tracker.',
                ],
            },
            storage: {
                title: 'Local and session storage',
                body: 'On some devices we also use sessionStorage (key rumtelo.pendingPlan) as a fallback for the plan you picked, because the website and app may run on different ports in local development. That value stays in that browser tab and is not sent to advertisers.',
            },
            manage: {
                title: 'How you can control cookies',
                body: 'You can delete or block cookies in your browser settings. If you block strictly necessary cookies, sign-in, household switching, and checkout hand-off may fail — that is a technical limit, not a penalty. We do not currently offer a consent banner because we do not set optional cookies. If we add analytics or marketing cookies later, a banner or preference centre will appear and you will be able to refuse them.',
            },
            third: {
                title: 'Third parties',
                body: 'Payment (Stripe) and email (Resend) may set their own cookies if you visit their hosted checkout or if your mail client loads remote content. Those cookies are governed by those providers. Our product pages do not embed advertising networks. Optional bank connect, when available, will take you through the licensed provider’s own flow.',
            },
            changes: {
                title: 'Changes',
                body: 'We will update this page when our cookie use changes. The “Last updated” date is the effective date.',
            },
            contact: {
                title: 'Contact',
                body: 'Questions: support@rumtelo.com. See also the Privacy Policy and Company information page.',
            },
        },
    },
    data_processing: {
        title: 'Data Processing',
        updated: '22 September 2026',
        intro_prefix:
            'This page is our public record of how Rumtelo processes personal data under the GDPR (roles, bases, processors and transfers). It does not replace a signed processor agreement if we ever process data on a business customer’s instructions. For household accounts we are the controller. Read this together with our',
        privacy_link: 'Privacy Policy',
        sections: {
            roles: {
                title: 'Roles',
                body: 'For your Rumtelo account and household data, Rumtelo is the data controller (GDPR Article 4(7)). Infrastructure, email and payment vendors are processors (Article 4(8) and Article 28) — they may process data only on our documented instructions, with confidentiality, security, and deletion or return at the end of the contract. An optional PSD2/AIS provider is typically an independent controller or a processor of the bank connection you start; we receive only the account information you authorise. Household members you invite are separate users, not our processors.',
            },
            purposes: {
                title: 'Purposes and legal bases',
                items: [
                    'Contract — create and run your account, household workspace, jars, Coach tips, export, and the product features you use.',
                    'Legitimate interest — security, fraud and abuse prevention, reliability, and product improvement that does not require advertising profiles; balanced against your rights, with an opt-out for improvement analytics if we ever add optional measurement.',
                    'Consent — optional bank connect; optional energy and soul logs (and Article 9 explicit consent where those logs are special-category data); any future marketing or non-essential cookies.',
                    'Legal obligation — tax, accounting, and consumer records for paid plans; lawful requests.',
                ],
            },
            categories: {
                title: 'Categories of data',
                body: 'Identity and contact data; authentication credentials (hashed) and session data; household financial and practice data you enter or import; household membership; billing identifiers; support content; technical logs. Special-category data only if you enter it in optional portals. We do not collect government ID numbers or full payment-card PANs.',
            },
            processors: {
                title: 'Processors we use (MVP)',
                items: [
                    'Railway (EU, Amsterdam region) — application hosting, PostgreSQL database, backups. Location of household data at rest: European Union.',
                    'Resend — transactional email (verification, password reset, security). Processing may occur in the United States, under Standard Contractual Clauses.',
                    'Stripe Payments Europe, Limited (and Stripe group companies) — subscription checkout, customer portal, invoices, tax-relevant payment records. Card data is handled in Stripe’s systems. Transfers to the United States use Stripe’s GDPR transfer tools.',
                    'Optional, only if you enable it later: a PSD2-licensed account-information provider for read-only bank sync. We will name the provider here before that feature goes live.',
                ],
            },
            measures: {
                title: 'Security measures (summary)',
                body: 'TLS in transit; encryption at rest on the hosted database; password hashing; optional 2FA; row-level household isolation in the application; access limited to operators who need it; backups in the same EU region. Processors are required to implement appropriate technical and organisational measures under Article 28.',
            },
            transfers: {
                title: 'International transfers',
                body: 'We prefer EU processing. Household databases stay in the Amsterdam region. If a processor accesses data from outside the EEA (email and payments today), we require Chapter V safeguards — primarily the EU Standard Contractual Clauses, plus the vendor’s supplementary measures. We do not transfer household ledgers to a US host for storage.',
            },
            subprocessors: {
                title: 'Changes to processors',
                body: 'We may replace a processor (for example a different EU host or email provider) if the new vendor offers equivalent or better protection. Material changes that affect how your data is processed will be reflected on this page or in the Privacy Policy, with notice when the law requires it. This page is the public subprocessor list for household users.',
            },
            rights: {
                title: 'Requests',
                body: 'Access, correction, export, deletion, restriction, objection, and consent withdrawal: support@rumtelo.com. We will handle requests as set out in the Privacy Policy. Supervisory authority: Autoriteit Persoonsgegevens, the Netherlands. If you are a business that needs a signed Article 28 agreement, contact us — household consumer accounts do not need one; we are not your processor.',
            },
            contact: {
                title: 'Contact',
                body: 'Privacy and processing questions: support@rumtelo.com. Company identification: Company information page.',
            },
        },
    },
    company: {
        title: 'Company information',
        updated: '22 September 2026',
        intro: 'This page identifies who operates Rumtelo, as required for an information-society service established in the Netherlands (including Book 3, Article 15d of the Dutch Civil Code and the EU Digital Services Act contact rules). It is our imprint / legal notice.',
        sections: {
            identity: {
                title: 'Operator',
                items: [
                    'Trade name: Rumtelo',
                    'Place of establishment: Amsterdam, the Netherlands',
                    'Registered legal name, Chamber of Commerce (KvK) number, VAT number and visiting address: published here when available for the operating entity, and always available on request at support@rumtelo.com.',
                    'Activity: household overview and educational coach (money, growth, energy, soul). Not a bank, payment institution, or licensed financial adviser.',
                ],
            },
            contact: {
                title: 'Contact points',
                items: [
                    'Product, accounts, billing and privacy: support@rumtelo.com',
                    'Press and partnerships: info@rumtelo.com',
                    'Digital Services Act single point of contact (users and authorities): support@rumtelo.com, language English or Dutch, Amsterdam time.',
                    'Contact page: rumtelo.com/support/contact',
                ],
            },
            hosting: {
                title: 'Hosting and data',
                body: 'The Service is hosted in the European Union (Amsterdam region) on Railway. Personal-data practices are described in the Privacy Policy, Cookie Policy and Data Processing page.',
            },
            authorities: {
                title: 'Authorities',
                items: [
                    'Data protection (Netherlands): Autoriteit Persoonsgegevens — https://www.autoriteitpersoonsgegevens.nl',
                    'Consumer and market supervision (Netherlands): Autoriteit Consument & Markt (ACM)',
                    'EEA users may also contact their local data-protection authority or use the EU Online Dispute Resolution platform for consumer disputes.',
                ],
            },
            regulated: {
                title: 'What we are not',
                body: 'Rumtelo is not authorised by De Nederlandsche Bank or the AFM as a bank, investment firm, or adviser. Coach output is education. Optional bank sync, when offered, will be provided through a third party that holds its own PSD2 licence. We do not move your money.',
            },
        },
    },
} as const;

export default legal;
