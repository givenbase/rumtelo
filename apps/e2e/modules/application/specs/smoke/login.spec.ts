import { basicTest as test, expect } from '../../../../shared/fixtures';

test.describe('application smoke @smoke', () => {
    test('Basic demo lands on home with jars nav', async ({ personaPage }) => {
        await personaPage.goto('/');
        await expect(personaPage).not.toHaveURL(/sign-in/);
        await expect(personaPage.locator('body')).toBeVisible();
        await personaPage.goto('/product/money/jars');
        await expect(personaPage).not.toHaveURL(/sign-in/);
        await expect(personaPage.getByTestId('main-nav')).toBeVisible({ timeout: 30_000 });
    });
});
