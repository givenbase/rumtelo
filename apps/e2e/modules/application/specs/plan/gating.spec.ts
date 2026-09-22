import { basicTest, plusTest, maxTest, expect } from '../../../../shared/fixtures';

const NET_WORTH_CREATE = '/product/growth/net-worth/create';
const PLAN_SETTINGS = '/settings/general/plan';

basicTest.describe('plan gating @plan', () => {
    basicTest('Basic sees debt locked', async ({ personaPage }) => {
        await personaPage.goto('/product/money/debt');
        await expect(personaPage.getByTestId('locked-plan-gate')).toBeVisible({ timeout: 30_000 });
        await expect(personaPage.locator(`a[href="${PLAN_SETTINGS}"]`)).toBeVisible();
    });

    basicTest('Basic can open growth income', async ({ personaPage }) => {
        await personaPage.goto('/product/growth/income');
        await expect(personaPage).not.toHaveURL(/sign-in/);
        await expect(personaPage.getByTestId('locked-plan-gate')).toHaveCount(0);
    });

    basicTest('Basic sees net worth locked', async ({ personaPage }) => {
        await personaPage.goto('/product/growth/net-worth');
        await expect(personaPage.getByTestId('locked-plan-gate')).toBeVisible({ timeout: 30_000 });
        await expect(personaPage.locator(`a[href="${NET_WORTH_CREATE}"]`)).toHaveCount(0);
    });

    basicTest('Basic can open goals', async ({ personaPage }) => {
        await personaPage.goto('/product/growth/goals');
        await expect(personaPage).not.toHaveURL(/sign-in/);
        await expect(personaPage.getByTestId('locked-plan-gate')).toHaveCount(0);
    });

    basicTest('Basic sees training locked', async ({ personaPage }) => {
        await personaPage.goto('/product/energy/training');
        await expect(personaPage.getByTestId('locked-plan-gate')).toBeVisible({ timeout: 30_000 });
    });
});

plusTest.describe('plan gating @plan', () => {
    plusTest('Plus can open debts', async ({ personaPage }) => {
        await personaPage.goto('/product/money/debt');
        await expect(personaPage).not.toHaveURL(/sign-in/);
        await expect(personaPage.getByTestId('locked-plan-gate')).toHaveCount(0);
    });

    plusTest('Plus sees Max screens locked', async ({ personaPage }) => {
        await personaPage.goto('/product/growth/net-worth');
        await expect(personaPage.getByTestId('locked-plan-gate')).toBeVisible({ timeout: 30_000 });
        await expect(personaPage.locator(`a[href="${NET_WORTH_CREATE}"]`)).toHaveCount(0);
    });

    plusTest('Plus can open goals', async ({ personaPage }) => {
        await personaPage.goto('/product/growth/goals');
        await expect(personaPage).not.toHaveURL(/sign-in/);
        await expect(personaPage.getByTestId('locked-plan-gate')).toHaveCount(0);
    });
});

maxTest.describe('plan gating @plan', () => {
    maxTest('Max can open income', async ({ personaPage }) => {
        await personaPage.goto('/product/growth/income');
        await expect(personaPage).not.toHaveURL(/sign-in/);
        await expect(personaPage.getByTestId('locked-plan-gate')).toHaveCount(0);
    });

    maxTest('Max can open net worth', async ({ personaPage }) => {
        await personaPage.goto('/product/growth/net-worth');
        await expect(personaPage).not.toHaveURL(/sign-in/);
        await expect(personaPage.getByTestId('locked-plan-gate')).toHaveCount(0);
        await expect(personaPage.getByTestId('list-toolbar-create')).toBeVisible();
    });
});
