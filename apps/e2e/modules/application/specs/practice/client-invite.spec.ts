import { practiceTest, plusTest, expect } from '../../../../shared/fixtures';
import { fetchPracticeInviteToken } from '../../../../shared/practice/outbox';

practiceTest.describe('practice client invite @practice', () => {
    practiceTest('lands on Practice clients', async ({ personaPage }) => {
        await personaPage.goto('/practice/clients');
        await expect(personaPage).not.toHaveURL(/sign-in/);
        await expect(personaPage.getByTestId('practice-add-client')).toBeVisible({
            timeout: 30_000,
        });
    });

    practiceTest('invites unknown email → toast + memory outbox token', async ({ personaPage }) => {
        const email = `e2e-invite-${Date.now()}@example.com`;

        await personaPage.goto('/practice/clients');
        await personaPage.getByTestId('practice-add-client').click();
        await personaPage.getByTestId('practice-add-client-email').fill(email);
        await personaPage.getByTestId('practice-add-client-submit').click();

        const toast = personaPage.getByTestId('toast');
        await expect(toast).toBeVisible({ timeout: 30_000 });
        await expect(toast).toContainText(/No user found with that email/i);

        const token = await fetchPracticeInviteToken(email);
        expect(token.length).toBeGreaterThanOrEqual(8);
    });

    practiceTest(
        're-invites existing household → waiting-for-accept toast',
        async ({ personaPage }) => {
            await personaPage.goto('/practice/clients');
            await personaPage.getByTestId('practice-add-client').click();
            await personaPage.getByTestId('practice-add-client-email').fill('max@rumtelo.com');
            await personaPage.getByTestId('practice-add-client-submit').click();

            const toast = personaPage.getByTestId('toast');
            await expect(toast).toBeVisible({ timeout: 30_000 });
            await expect(toast).toContainText(/waiting for household accept/i);
        }
    );
});

plusTest.describe('practice dual-consent @practice', () => {
    plusTest('Plus accepts seeded Practice invite (or already active)', async ({ personaPage }) => {
        await personaPage.goto('/settings');
        await expect(personaPage).not.toHaveURL(/sign-in/);

        const accept = personaPage.getByTestId('practice-link-accept');
        await expect
            .poll(async () => accept.count(), { timeout: 30_000 })
            .toBeGreaterThanOrEqual(0);

        if ((await accept.count()) > 0) {
            await accept.first().click();
            const toast = personaPage.getByTestId('toast');
            await expect(toast).toBeVisible({ timeout: 30_000 });
            await expect(toast).toContainText(/accepted/i);
        }

        // Seeded Rumtelo Coaching link is pending or already accepted after prior runs.
        await expect(
            personaPage.getByText(/Rumtelo Coaching|Practice coaches/i).first()
        ).toBeVisible({
            timeout: 15_000,
        });
    });
});
