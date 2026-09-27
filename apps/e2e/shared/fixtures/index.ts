import { test as base, expect, type Page } from '@playwright/test';

import { signInAsPersona } from '../auth/session';
import type { DemoPersona } from '../env';

type PersonaFixtures = {
    personaPage: Page;
};

function createPersonaTest(persona: DemoPersona) {
    return base.extend<PersonaFixtures>({
        personaPage: async ({ page }, use, testInfo) => {
            if (testInfo.timeout < 300_000) testInfo.setTimeout(300_000);
            await signInAsPersona(page, persona);
            await use(page);
        },
    });
}

export const basicTest = createPersonaTest('basic');
export const plusTest = createPersonaTest('plus');
export const maxTest = createPersonaTest('max');
export const practiceTest = createPersonaTest('practice');

export { expect };
