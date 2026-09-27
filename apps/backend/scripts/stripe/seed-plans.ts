/**
 * Create Rumtelo Plus / Max Stripe Products + recurring Prices (idempotent).
 * Also seeds household seat add-ons and Practice B2B prices (base + staff + client).
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
    STRIPE_PRACTICE_BASE_CATALOG,
    STRIPE_PRACTICE_CLIENT_CATALOG,
    STRIPE_PRACTICE_SEAT_CATALOG,
    STRIPE_SEAT_ADDON_CATALOG,
    type BillingInterval,
    type PaidPlanKey,
} from '../../src/modules/public/platform/billing/config/stripe-plans.config';
import { SeatAddonKind } from '@rumtelo/contracts';

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

/**
 * Idempotent: create or skip a recurring per-unit-amount price with a stable lookup_key.
 * Used for seat add-ons and practice staff seats (all monthly, no yearly variant).
 */
async function ensureAddonPrice(
    stripe: Stripe,
    opts: {
        name: string;
        description: string;
        currency: string;
        monthCents: number;
        lookupKey: string;
        metaKind: string;
        metaType: string;
    }
): Promise<Stripe.Price> {
    const existing = await stripe.prices.list({
        lookup_keys: [opts.lookupKey],
        limit: 1,
        active: true,
    });

    if (existing.data.length > 0) {
        const price = existing.data[0];
        console.log(`  ⏭  ${opts.lookupKey} → ${price.id} (exists)`);
        return price;
    }

    // Ensure a product for this add-on exists.
    const products = await stripe.products.search({
        query: `metadata['addon_kind']:'${opts.metaKind}' AND metadata['product_type']:'${opts.metaType}'`,
        limit: 1,
    });

    let productId: string;
    if (products.data.length > 0) {
        productId = products.data[0].id;
    } else {
        const product = await stripe.products.create({
            name: opts.name,
            description: opts.description,
            metadata: {
                addon_kind: opts.metaKind,
                product_type: opts.metaType,
                category: 'rumtelo',
            },
        });
        productId = product.id;
    }

    const price = await stripe.prices.create({
        product: productId,
        unit_amount: Math.round(opts.monthCents),
        currency: opts.currency,
        recurring: { interval: 'month' },
        lookup_key: opts.lookupKey,
        nickname: opts.name,
        metadata: {
            addon_kind: opts.metaKind,
            billing_interval: 'month',
        },
    });

    console.log(`  ✓  ${opts.lookupKey} → ${price.id} (€${(opts.monthCents / 100).toFixed(2)}/mo)`);
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

    // ── Household plans (Plus / Max) ──────────────────────────────────
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

    // ── Household seat add-ons ────────────────────────────────────────
    console.log('\n🪑 Household seat add-ons');
    for (const kind of [SeatAddonKind.CONTRIBUTOR, SeatAddonKind.VIEWER]) {
        const catalog = STRIPE_SEAT_ADDON_CATALOG[kind];
        const price = await ensureAddonPrice(stripe, {
            name: catalog.name,
            description: catalog.description,
            currency: catalog.currency,
            monthCents: catalog.month * 100,
            lookupKey: catalog.lookupKey,
            metaKind: kind,
            metaType: 'household_seat_addon',
        });
        envLines.push(`STRIPE_PRICE_ID_ADDON_${kind.toUpperCase()}=${price.id}`);
    }

    // ── Practice B2B (base + staff + client) ──────────────────────────
    console.log('\n🏢 Practice pricing');
    for (const catalog of [
        {
            ...STRIPE_PRACTICE_BASE_CATALOG,
            metaKind: 'practice_base',
            metaType: 'practice_base_subscription',
            envName: 'STRIPE_PRICE_ID_PRACTICE_BASE',
        },
        {
            ...STRIPE_PRACTICE_SEAT_CATALOG,
            metaKind: 'practice_seat',
            metaType: 'practice_seat_meter',
            envName: 'STRIPE_PRICE_ID_PRACTICE_SEAT',
        },
        {
            ...STRIPE_PRACTICE_CLIENT_CATALOG,
            metaKind: 'practice_client',
            metaType: 'practice_client_meter',
            envName: 'STRIPE_PRICE_ID_PRACTICE_CLIENT',
        },
    ]) {
        const price = await ensureAddonPrice(stripe, {
            name: catalog.name,
            description: catalog.description,
            currency: catalog.currency,
            monthCents: catalog.month * 100,
            lookupKey: catalog.lookupKey,
            metaKind: catalog.metaKind,
            metaType: catalog.metaType,
        });
        envLines.push(`${catalog.envName}=${price.id}`);
    }

    console.log('\n✅ Catalog ready. Lookup keys (same in staging + prod after each seed):');
    for (const planKey of PLAN_KEYS) {
        for (const interval of INTERVALS) {
            console.log(`   ${STRIPE_PLAN_LOOKUP_KEYS[planKey][interval]}`);
        }
    }
    for (const kind of [SeatAddonKind.CONTRIBUTOR, SeatAddonKind.VIEWER]) {
        console.log(`   ${STRIPE_SEAT_ADDON_CATALOG[kind].lookupKey}`);
    }
    console.log(`   ${STRIPE_PRACTICE_BASE_CATALOG.lookupKey}`);
    console.log(`   ${STRIPE_PRACTICE_SEAT_CATALOG.lookupKey}`);
    console.log(`   ${STRIPE_PRACTICE_CLIENT_CATALOG.lookupKey}`);

    console.log('\n📋 Price IDs (optional reference / Dashboard):');
    for (const line of envLines) console.log(`   ${line}`);
    console.log('');
}

main().catch(err => {
    console.error('\n❌ Seed failed:', err);
    process.exit(1);
});
