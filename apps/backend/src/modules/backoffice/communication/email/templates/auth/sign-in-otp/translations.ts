import type { EmailLanguageObject } from '../../../utils/email-translation.util';

export const languageObject: EmailLanguageObject = {
    en: {
        'email.auth.sign_in_otp.header.preview_text': 'Your Rumtelo sign-in code',
        'email.auth.sign_in_otp.header.title': 'Sign-in code — Rumtelo',
        'email.auth.sign_in_otp.header.heading': 'Your sign-in code',
        'email.auth.sign_in_otp.body.greeting': 'Hi {firstName},',
        'email.auth.sign_in_otp.body.message':
            'Use this one-time code to open Rumtelo. No password needed.',
        'email.auth.sign_in_otp.body.code_label': 'Your code',
        'email.auth.sign_in_otp.body.expiration_note':
            'This code expires in {expiresInMinutes} minutes.',
        'email.auth.sign_in_otp.body.safety_note':
            'If you did not ask for this code, you can safely ignore this message.',
    },
    nl: {
        'email.auth.sign_in_otp.header.preview_text': 'Je Rumtelo-inlogcode',
        'email.auth.sign_in_otp.header.title': 'Inlogcode — Rumtelo',
        'email.auth.sign_in_otp.header.heading': 'Je inlogcode',
        'email.auth.sign_in_otp.body.greeting': 'Hallo {firstName},',
        'email.auth.sign_in_otp.body.message':
            'Gebruik deze eenmalige code om Rumtelo te openen. Geen wachtwoord nodig.',
        'email.auth.sign_in_otp.body.code_label': 'Jouw code',
        'email.auth.sign_in_otp.body.expiration_note':
            'Deze code verloopt over {expiresInMinutes} minuten.',
        'email.auth.sign_in_otp.body.safety_note':
            'Als je geen code hebt gevraagd, kun je deze e-mail negeren.',
    },
};
