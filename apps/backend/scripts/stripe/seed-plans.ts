/**
 * Create Rumtelo Plus / Max Stripe Products + recurring Prices (idempotent).
 *
 * Seeds Stripe plans with stable lookup_keys
 * so test and live accounts share the same code paths after seeding each one.
 *
 * Usage:
 *   pnpm env:use:staging && pnpm stripe:seed-plans:stag
 *   pnpm env:use:production && pnpm stripe:seed-plans:prod
 *   pnpm stripe:seed-plans          # local / development .env
 *
 * Production requires `--yes` (or CONFIRM=yes) when NODE_ENV=production.
 */
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

import Stripe from 'stripe';

import { loadEnvFiles } from '../../src/common/config/load-env';
import {
    STRIPE_PLAN_CATALOG,
    STRIPE_PLAN_LOOKUP_KEYS,
    type BillingInterval,
    type PaidPlanKey,
} from '../../src/modules/public/platform/billing/config/stripe-plans.config';

const loadedEnvPath = loadEnvFiles();

const PLAN_KEYS = Object.keys(STRIPE_PLAN_CATALOG) as PaidPlanKey[];
const INTERVALS: BillingInterval[] = ['month', 'year'];

async function ensureProduct(stripe: Stripe, planKey: PaidPlanKey): Promise<Stripe.Product> {
    const catalog = STRIPE_PLAN_CATALOG[planKey];
    const existing = await stripe.products.search({
        query: `metadata['plan_key']:'${planKey}' AND metadata['product_type']:'subscription'`,
        limit: 1,
    });

    const payload = {
        name: catalog.name,
        description: catalog.description,
        metadata: {
            plan_key: planKey,
            product_type: 'subscription',
            category: 'rumtelo',
        },
    };

    if (existing.data.length > 0) {
        const product = existing.data[0];
        await stripe.products.update(product.id, payload);
        console.log(`↻ Product ${planKey}: ${product.id}`);
        return product;
    }

    const product = await stripe.products.create({
        ...payload,
        tax_code: 'txcd_10103001',
    });
    console.log(`✓ Product ${planKey}: ${product.id}`);
    return product;
}

async function ensurePrice(
    stripe: Stripe,
    productId: string,
    planKey: PaidPlanKey,
    interval: BillingInterval
): Promise<Stripe.Price> {
    const catalog = STRIPE_PLAN_CATALOG[planKey];
    const lookupKey = STRIPE_PLAN_LOOKUP_KEYS[planKey][interval];
    const amountMajor = catalog[interval];

    const existing = await stripe.prices.list({
        lookup_keys: [lookupKey],
        limit: 1,
        active: true,
    });

    if (existing.data.length > 0) {
        const price = existing.data[0];
        console.log(`  ⏭  ${lookupKey} → ${price.id} (exists)`);
        return price;
    }

    const price = await stripe.prices.create({
        product: productId,
        unit_amount: amountMajor * 100,
        currency: catalog.currency,
        recurring: { interval },
        lookup_key: lookupKey,
        nickname: `${catalog.name} — ${interval === 'month' ? 'Monthly' : 'Yearly'}`,
        metadata: {
            plan_key: planKey,
            billing_interval: interval,
        },
    });

    console.log(
        `  ✓  ${lookupKey} → ${price.id} (€${amountMajor}/${interval === 'month' ? 'mo' : 'yr'})`
    );
    return price;
}

function hasFlag(flag: string): boolean {
    return process.argv.includes(flag);
}

async function confirmProduction(nodeEnv: string, stripeMode: 'live' | 'test'): Promise<void> {
    if (nodeEnv !== 'production') return;
    if (hasFlag('--yes') || process.env.CONFIRM === 'yes') return;

    console.log(
        '\n⚠️  NODE_ENV=production — this seeds the Stripe account for the production key.'
    );
    console.log(`   Stripe mode detected: ${stripeMode}`);
    if (stripeMode === 'test') {
        console.log(
            '   Note: key looks like sk_test_… — usually staging uses test; prod uses sk_live_…'
        );
    }

    if (!input.isTTY) {
        console.error('❌ Refusing production seed without --yes in non-interactive mode.');
        process.exit(1);
    }

    const rl = createInterface({ input, output });
    const answer = await rl.question('Type "seed production" to continue: ');
    rl.close();
    if (answer.trim() !== 'seed production') {
        console.error('Aborted.');
        process.exit(1);
    }
}

async function main() {
    const nodeEnv = process.env.NODE_ENV || 'development';
    const secret = process.env.STRIPE_SECRET_KEY?.trim();
    if (!secret) {
        console.error('❌ STRIPE_SECRET_KEY is required.');
        console.error('   pnpm env:use:staging   then  pnpm stripe:seed-plans:stag');
        console.error('   pnpm env:use:production then  pnpm stripe:seed-plans:prod');
        process.exit(1);
    }

    const stripeMode = secret.startsWith('sk_live') ? 'live' : 'test';
    await confirmProduction(nodeEnv, stripeMode);

    if (nodeEnv === 'staging' && stripeMode === 'live') {
        console.warn(
            '⚠️  NODE_ENV=staging but STRIPE_SECRET_KEY is sk_live_… — seeding the live Stripe account.'
        );
    }
    if (nodeEnv === 'production' && stripeMode === 'test') {
        console.warn(
            '⚠️  NODE_ENV=production but STRIPE_SECRET_KEY is sk_test_… — seeding the test Stripe account.'
        );
    }

    const stripe = new Stripe(secret);
    console.log(`\n💳 Seeding Rumtelo Stripe catalog`);
    console.log(`   NODE_ENV=${nodeEnv} · Stripe=${stripeMode}`);
    if (loadedEnvPath) console.log(`   env file → ${loadedEnvPath}`);
    console.log('');

    const envLines: string[] = [];

    for (const planKey of PLAN_KEYS) {
        console.log(`\n📦 ${STRIPE_PLAN_CATALOG[planKey].name}`);
        const product = await ensureProduct(stripe, planKey);

        for (const interval of INTERVALS) {
            const price = await ensurePrice(stripe, product.id, planKey, interval);
            const envName =
                interval === 'month'
                    ? `STRIPE_PRICE_ID_${planKey}_MONTHLY`
                    : `STRIPE_PRICE_ID_${planKey}_YEARLY`;
            envLines.push(`${envName}=${price.id}`);
        }
    }

    console.log('\n✅ Catalog ready. Lookup keys (same in staging + prod after each seed):');
    for (const planKey of PLAN_KEYS) {
        for (const interval of INTERVALS) {
            console.log(`   ${STRIPE_PLAN_LOOKUP_KEYS[planKey][interval]}`);
        }
    }

    console.log('\n📋 Price IDs (optional reference / Dashboard):');
    for (const line of envLines) console.log(`   ${line}`);
    console.log('');
}

main().catch(err => {
    console.error('\n❌ Seed failed:', err);
    process.exit(1);
});
