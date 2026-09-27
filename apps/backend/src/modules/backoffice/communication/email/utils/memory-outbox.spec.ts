import { afterEach, describe, expect, it } from 'vitest';

import {
    clearMemoryEmails,
    listMemoryEmails,
    practiceInviteTokenFromHtml,
    pushMemoryEmail,
} from './memory-outbox';

afterEach(() => {
    clearMemoryEmails();
});

describe('memory-outbox', () => {
    it('stores and filters by recipient', () => {
        pushMemoryEmail({
            to: ['Coach@Example.com'],
            subject: 'A',
            html: '<a href="https://x/sign-up?practiceInvite=01932e4e-1111-7111-8111-111111111111&email=a">x</a>',
        });
        pushMemoryEmail({
            to: ['other@example.com'],
            subject: 'B',
            html: '<p>no token</p>',
        });

        expect(listMemoryEmails()).toHaveLength(2);
        expect(listMemoryEmails({ to: 'coach@example.com' })).toHaveLength(1);
        expect(listMemoryEmails({ to: 'missing@example.com' })).toHaveLength(0);
    });

    it('extracts practiceInvite token from HTML', () => {
        const token = '01932e4e-abcd-7abc-8abc-abcdef012345';
        expect(
            practiceInviteTokenFromHtml(
                `<a href="https://rumtelo.local/sign-up?practiceInvite=${token}&email=x%40y.com">Go</a>`
            )
        ).toBe(token);
        expect(practiceInviteTokenFromHtml('<p>plain</p>')).toBeNull();
    });
});
