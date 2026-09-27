import type { Page } from '@playwright/test';

import { credentialsFor, type DemoPersona } from '../env';

/** Sign in via the application form and wait for the shell. */
export async function signInAsPersona(page: Page, persona: DemoPersona): Promise<void> {
    const { email, password } = credentialsFor(persona);
    await page.goto('/sign-in');
    const emailField = page.getByTestId('sign-in-email').or(page.locator('#email'));
    await emailField.waitFor({ state: 'visible', timeout: 60_000 });
    await emailField.fill(email);
    const passwordField = page.getByTestId('sign-in-password').or(page.locator('#password'));
    await passwordField.fill(password);
    await page.getByTestId('sign-in-submit').click();
    await page.waitForURL(url => !url.pathname.includes('/sign-in'), { timeout: 60_000 });
}
