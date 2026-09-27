import { config as loadDotenv } from 'dotenv';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

for (const file of ['.env', '.env.local']) {
    const path = resolve(packageRoot, file);
    if (existsSync(path)) loadDotenv({ path });
}

function readUrl(name: string, fallback: string): string {
    return (process.env[name] ?? fallback).replace(/\/$/, '');
}

export type DemoPersona = 'basic' | 'plus' | 'max' | 'practice';

/** Keep in sync with `@rumtelo/contracts/platform` `demoPassword`. */
const DEMO_PASSWORDS: Record<DemoPersona, string> = {
    basic: 'teloBasic1!',
    plus: 'teloPlus1!',
    max: 'teloMax1!',
    practice: 'teloPractice1!',
};

export const e2eEnv = {
    appUrl: readUrl('APP_URL', 'http://localhost:3000'),
    backendUrl: readUrl('BACKEND_URL', 'http://localhost:3002'),
    accounts: {
        basic: {
            email: process.env.E2E_BASIC_EMAIL ?? 'basic@rumtelo.com',
            password: process.env.E2E_BASIC_PASSWORD ?? DEMO_PASSWORDS.basic,
        },
        plus: {
            email: process.env.E2E_PLUS_EMAIL ?? 'plus@rumtelo.com',
            password: process.env.E2E_PLUS_PASSWORD ?? DEMO_PASSWORDS.plus,
        },
        max: {
            email: process.env.E2E_MAX_EMAIL ?? 'max@rumtelo.com',
            password: process.env.E2E_MAX_PASSWORD ?? DEMO_PASSWORDS.max,
        },
        practice: {
            email: process.env.E2E_PRACTICE_EMAIL ?? 'practice@rumtelo.com',
            password: process.env.E2E_PRACTICE_PASSWORD ?? DEMO_PASSWORDS.practice,
        },
    },
} as const;

export function credentialsFor(persona: DemoPersona) {
    return e2eEnv.accounts[persona];
}
