import { describe, expect, it } from 'vitest';

import { PracticeAddClientResult, PracticeClientAccess } from '@rumtelo/contracts';

describe('PracticeAddClientResult', () => {
    it('accepts email_invite with no_user reason', () => {
        const parsed = PracticeAddClientResult.parse({
            outcome: 'email_invite',
            reason: 'no_user',
            email: 'new@example.com',
            access: PracticeClientAccess.VIEW,
            link: null,
            expiresAt: '2026-10-11T12:00:00.000Z',
        });
        expect(parsed.outcome).toBe('email_invite');
        expect(parsed.reason).toBe('no_user');
        expect(parsed.link).toBeNull();
    });

    it('accepts email_invite with no_household reason', () => {
        const parsed = PracticeAddClientResult.parse({
            outcome: 'email_invite',
            reason: 'no_household',
            email: 'orphan@example.com',
            access: PracticeClientAccess.MANAGE,
            link: null,
            expiresAt: '2026-10-11T12:00:00.000Z',
        });
        expect(parsed.reason).toBe('no_household');
    });

    it('accepts link_pending with null reason', () => {
        const parsed = PracticeAddClientResult.parse({
            outcome: 'link_pending',
            reason: null,
            email: 'plus@rumtelo.com',
            access: PracticeClientAccess.VIEW,
            link: null,
            expiresAt: null,
        });
        expect(parsed.outcome).toBe('link_pending');
        expect(parsed.reason).toBeNull();
    });

    it('rejects unknown reason', () => {
        expect(() =>
            PracticeAddClientResult.parse({
                outcome: 'email_invite',
                reason: 'typo',
                email: 'a@b.com',
                access: PracticeClientAccess.VIEW,
                link: null,
                expiresAt: null,
            })
        ).toThrow(/Invalid/);
    });
});
