import type { EmailLanguageObject } from '../../../utils/email-translation.util';

export const languageObject: EmailLanguageObject = {
    en: {
        'email.household.invite.header.preview_text':
            '{who} invited you to share a household on Rumtelo',
        'email.household.invite.header.title': 'Household invite — Rumtelo',
        'email.household.invite.header.heading': 'You are invited',
        'email.household.invite.body.message':
            '{who} invited you to the household {household} as {role}.',
        'email.household.invite.body.role_viewer': 'viewer',
        'email.household.invite.body.role_member': 'member',
        'email.household.invite.body.role_admin': 'admin',
        'email.household.invite.body.role_owner': 'owner',
        'email.household.invite.body.button': 'Open invitation',
        'email.household.invite.body.link_hint':
            'Button not working? Paste this link in your browser:',
    },
    nl: {
        'email.household.invite.header.preview_text':
            '{who} nodigt je uit voor een huishouden op Rumtelo',
        'email.household.invite.header.title': 'Huishouden uitnodiging — Rumtelo',
        'email.household.invite.header.heading': 'Je bent uitgenodigd',
        'email.household.invite.body.message':
            '{who} nodigt je uit voor het huishouden {household} als {role}.',
        'email.household.invite.body.role_viewer': 'kijker',
        'email.household.invite.body.role_member': 'lid',
        'email.household.invite.body.role_admin': 'beheerder',
        'email.household.invite.body.role_owner': 'eigenaar',
        'email.household.invite.body.button': 'Open uitnodiging',
        'email.household.invite.body.link_hint':
            'Werkt de knop niet? Plak deze link in je browser:',
    },
};
