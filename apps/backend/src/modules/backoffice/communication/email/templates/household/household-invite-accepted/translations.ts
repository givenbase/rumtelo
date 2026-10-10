import type { EmailLanguageObject } from '../../../utils/email-translation.util';

export const languageObject: EmailLanguageObject = {
    en: {
        'email.household.invite_accepted.header.preview_text':
            '{who} joined {household} on Rumtelo',
        'email.household.invite_accepted.header.title': 'Someone joined your household — Rumtelo',
        'email.household.invite_accepted.header.heading': 'Invitation accepted',
        'email.household.invite_accepted.body.message':
            '{who} ({email}) accepted the invite to {household} as {role}. You can see them under Household settings, including when they were last signed in.',
        'email.household.invite_accepted.body.role_viewer': 'viewer',
        'email.household.invite_accepted.body.role_member': 'member',
        'email.household.invite_accepted.body.role_admin': 'admin',
        'email.household.invite_accepted.body.role_owner': 'owner',
        'email.household.invite_accepted.body.button': 'Open household settings',
        'email.household.invite_accepted.body.link_hint':
            'Button not working? Paste this link in your browser:',
    },
    nl: {
        'email.household.invite_accepted.header.preview_text':
            '{who} is lid geworden van {household} op Rumtelo',
        'email.household.invite_accepted.header.title':
            'Iemand is lid geworden van je huishouden — Rumtelo',
        'email.household.invite_accepted.header.heading': 'Uitnodiging geaccepteerd',
        'email.household.invite_accepted.body.message':
            '{who} ({email}) heeft de uitnodiging voor {household} geaccepteerd als {role}. Je ziet hen onder Huishouden-instellingen, inclusief wanneer ze voor het laatst waren ingelogd.',
        'email.household.invite_accepted.body.role_viewer': 'kijker',
        'email.household.invite_accepted.body.role_member': 'lid',
        'email.household.invite_accepted.body.role_admin': 'beheerder',
        'email.household.invite_accepted.body.role_owner': 'eigenaar',
        'email.household.invite_accepted.body.button': 'Open huishouden-instellingen',
        'email.household.invite_accepted.body.link_hint':
            'Werkt de knop niet? Plak deze link in je browser:',
    },
};
