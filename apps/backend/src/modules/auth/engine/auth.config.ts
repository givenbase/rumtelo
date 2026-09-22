import { betterAuth } from 'better-auth';
import { createAuthMiddleware } from 'better-auth/api';
import { organization, twoFactor } from 'better-auth/plugins';
import { SignUpAccountProfile, toSignUpAccountProfile } from '@rumtelo/contracts';
import { buildBetterAuthTrustedOrigins, resolveCrossSubdomainCookieDomain } from '@rumtelo/utils';
import { Pool } from 'pg';
import { v7 as uuidv7 } from 'uuid';

import type { Env } from '../../../common/config/env.config';
import { createBetterAuthSecondaryStorage } from '../../../common/redis/better-auth-redis.storage';
import { EmailService } from '../../backoffice/communication/email';

import { householdAccessControl, householdRoles } from './access-control.config';
import { rewriteBetterAuthUrlToOrigin } from './auth-url.util';
import { insertAccountForSignUp } from './sign-up-account.util';
import { stashSignUpAccountProfile, takeSignUpAccountProfile } from './sign-up-profile.store';

/** Better Auth verification links expire after this many hours (product copy). */
const EMAIL_VERIFICATION_EXPIRES_HOURS = 48;
/** Better Auth password-reset tokens — default is 1 hour. */
const PASSWORD_RESET_EXPIRES_HOURS = 1;

function authUserFirstName(user: { name?: string | null; email: string }): string {
    const fromName = user.name?.trim().split(/\s+/)[0];
    if (fromName) return fromName;
    return user.email.split('@')[0] || 'there';
}

/**
 * better-auth owns and writes its tables (user, session, provider, verification,
 * organization, member, invitation, two_factor) and migrates them via
 * `pn auth:migrate`. The sibling folders here (user/, member/, …) map read-only
 * MikroORM entities over the same tables so the rest of the backend gets typed,
 * relational reads — better-auth stays the single writer.
 *
 * Column names are snake_case like every other schema. better-auth is camelCase
 * internally, so each model maps its fields explicitly below. Plugin-added
 * columns (activeOrganizationId, twoFactorEnabled, …) are NOT covered by the
 * top-level `fields` — they must be mapped on the plugin's own `schema` option.
 *
 * The organization plugin *is* our Household: it gives invitations, roles and an
 * active-organization on the session for free, which is precisely what couples
 * sharing a budget need.
 *
 * Acquisition / recovery emails (verify, reset) land on DOMAIN_WEB; product
 * sessions bind on DOMAIN_APP via `/api/auth` proxies. Production/staging use
 * cross-subdomain cookies on `.rumtelo.com` (no www).
 *
 * IDs: Better Auth mints uuidv7 via `advanced.database.generateId` (same as BaseEntity).
 * Columns stay Postgres `uuid`. Personal profile lives on Rumtelo `auth.account`, not BA.
 */
export function createAuth(env: Env) {
    const pool = new Pool({
        connectionString: env.DATABASE_URL,
        ssl: env.DATABASE_SSL ? { rejectUnauthorized: false } : undefined,
        /**
         * better-auth is schema-unaware, so its pool connects with search_path
         * pinned to the `auth` schema. Its tables live
         * there, namespaced like every other domain — never in `public`.
         */
        options: '-c search_path=auth',
    });

    const emailService = new EmailService();
    const requireEmailVerification = env.EMAIL_VERIFICATION_ENABLED;
    const webOrigin = env.DOMAIN_WEB.replace(/\/$/, '');
    const isSecureCookieEnv = env.NODE_ENV === 'production' || env.NODE_ENV === 'staging';

    const trustedOrigins = buildBetterAuthTrustedOrigins([
        env.DOMAIN_APP,
        env.DOMAIN_WEB,
        env.DOMAIN_BACK_PUBLIC,
    ]);

    const cookieDomain = isSecureCookieEnv
        ? resolveCrossSubdomainCookieDomain(env.DOMAIN_WEB, env.DOMAIN_APP)
        : undefined;

    const secondaryStorage = createBetterAuthSecondaryStorage(env.DATABASE_REDIS_URL);

    return betterAuth({
        database: pool,
        secret: env.BETTER_AUTH_SECRET,
        // Public origin — private DOMAIN_BACK is for service-to-service only.
        baseURL: env.DOMAIN_BACK_PUBLIC,
        trustedOrigins,
        // Rate limits + session cache share Redis when DATABASE_REDIS_URL is valid.
        secondaryStorage,

        /**
         * Sign-up body may include Account profile fields (firstName, …).
         * Better Auth ignores undeclared user fields; we stash them here and
         * create `auth.account` in `databaseHooks.user.create.after`.
         */
        hooks: {
            before: createAuthMiddleware(async ctx => {
                if (ctx.path !== '/sign-up/email') return;
                const body = ctx.body as Record<string, unknown> | undefined;
                if (!body || typeof body.email !== 'string') return;
                const parsed = SignUpAccountProfile.safeParse(body);
                if (!parsed.success) return;
                await stashSignUpAccountProfile(body.email, toSignUpAccountProfile(parsed.data));
            }),
        },

        databaseHooks: {
            user: {
                create: {
                    after: async user => {
                        const profile = await takeSignUpAccountProfile(user.email);
                        try {
                            await insertAccountForSignUp(pool, user.id, profile);
                        } catch (error) {
                            console.error(
                                '[Better Auth] Failed to create auth.account on sign-up',
                                error
                            );
                        }
                    },
                },
            },
        },

        emailAndPassword: {
            enabled: true,
            minPasswordLength: 8,
            requireEmailVerification,
            sendResetPassword: async ({ user, url }) => {
                // Fire-and-forget — avoid timing attacks on account enumeration.
                void emailService
                    .sendPasswordResetEmail({
                        to: user.email,
                        firstName: authUserFirstName(user),
                        resetUrl: rewriteBetterAuthUrlToOrigin(url, webOrigin),
                        expiresInHours: PASSWORD_RESET_EXPIRES_HOURS,
                    })
                    .then(sent => {
                        if (!sent) {
                            console.error('[Better Auth] Failed to send password reset email');
                        }
                    });
            },
        },

        // Docs: https://www.better-auth.com/docs/concepts/email
        // Required when requireEmailVerification / sendOnSignUp / client sendVerificationEmail.
        // Do NOT sendOnSignIn — every failed unverified login would spam verify emails.
        // Always send on sign-up so `/verify` is honest; hard-block only when flag is on.
        emailVerification: {
            sendOnSignUp: true,
            sendOnSignIn: false,
            autoSignInAfterVerification: true,
            sendVerificationEmail: async ({ user, url }) => {
                const sent = await emailService.sendEmailVerificationEmail({
                    to: user.email,
                    firstName: authUserFirstName(user),
                    verificationUrl: rewriteBetterAuthUrlToOrigin(url, webOrigin),
                    expiresInHours: EMAIL_VERIFICATION_EXPIRES_HOURS,
                });
                if (!sent) {
                    console.error('[Better Auth] Failed to send email verification email');
                }
            },
        },

        rateLimit: {
            enabled: true,
            window: 60,
            max: 100,
            customRules: {
                '/sign-in/email': { window: 60, max: 5 },
                '/send-verification-email': { window: 300, max: 2 },
                '/request-password-reset': { window: 300, max: 2 },
                '/forget-password': { window: 300, max: 2 },
            },
        },

        user: {
            fields: {
                emailVerified: 'email_verified',
                createdAt: 'created_at',
                updatedAt: 'updated_at',
            },
        },

        session: {
            expiresIn: 60 * 60 * 24 * 30,
            updateAge: 60 * 60 * 24,
            cookieCache: { enabled: true, maxAge: 60 * 5 },
            fields: {
                expiresAt: 'expires_at',
                createdAt: 'created_at',
                updatedAt: 'updated_at',
                ipAddress: 'ip_address',
                userAgent: 'user_agent',
                userId: 'user_id',
            },
        },

        account: {
            accountLinking: { enabled: true },
            // better-auth's "account" is really the sign-in provider link
            // (password hash, OAuth tokens). Renamed to `provider` so the
            // `account` name stays free for Rumtelo's own profile data.
            modelName: 'provider',
            fields: {
                accountId: 'account_id',
                providerId: 'provider_id',
                userId: 'user_id',
                accessToken: 'access_token',
                refreshToken: 'refresh_token',
                idToken: 'id_token',
                accessTokenExpiresAt: 'access_token_expires_at',
                refreshTokenExpiresAt: 'refresh_token_expires_at',
                createdAt: 'created_at',
                updatedAt: 'updated_at',
            },
        },

        verification: {
            fields: {
                expiresAt: 'expires_at',
                createdAt: 'created_at',
                updatedAt: 'updated_at',
            },
        },

        plugins: [
            organization({
                ac: householdAccessControl,
                roles: householdRoles,
                allowUserToCreateOrganization: true,
                organizationLimit: 5,
                creatorRole: 'owner',
                membershipLimit: 10,
                schema: {
                    organization: {
                        // DB table `auth.household` — SDK still uses organization.*
                        modelName: 'household',
                        fields: { createdAt: 'created_at' },
                    },
                    member: {
                        fields: {
                            organizationId: 'household_id',
                            userId: 'user_id',
                            createdAt: 'created_at',
                        },
                    },
                    invitation: {
                        fields: {
                            organizationId: 'household_id',
                            inviterId: 'inviter_id',
                            expiresAt: 'expires_at',
                            createdAt: 'created_at',
                        },
                    },
                    // Session column owned by the organization plugin, not core session.fields.
                    session: {
                        fields: { activeOrganizationId: 'active_household_id' },
                    },
                },
            }),
            // A finance app should not treat second-factor as optional plumbing.
            twoFactor({
                issuer: 'Rumtelo',
                schema: {
                    twoFactor: {
                        modelName: 'two_factor',
                        fields: {
                            backupCodes: 'backup_codes',
                            userId: 'user_id',
                            failedVerificationCount: 'failed_verification_count',
                            lockedUntil: 'locked_until',
                        },
                    },
                    // User column owned by the twoFactor plugin, not core user.fields.
                    user: {
                        fields: { twoFactorEnabled: 'two_factor_enabled' },
                    },
                },
            }),
        ],

        /**
         * Cross-subdomain SSO (`rumtelo.com` + `app.rumtelo.com`, no www).
         * Better Auth only applies Domain via `advanced.crossSubDomainCookies` —
         * a top-level `cookie.domain` is ignored (host-only → re-login per app).
         * @see https://www.better-auth.com/docs/concepts/cookies#cross-subdomain-cookies
         */
        advanced: {
            database: {
                /**
                 * Same uuidv7 as {@link BaseEntity} — time-ordered Postgres uuid PKs.
                 * Built-in `"uuid"` would mint v4 via gen_random_uuid(); we mint in JS.
                 * @see https://www.better-auth.com/docs/concepts/database#option-3-consistent-custom-id-generator
                 */
                generateId: () => uuidv7(),
            },
            /**
             * Next auth proxy stamps a single-value `x-real-ip` (Railway XFF is
             * multi-hop; BA only trusts one hop without `trustedProxies`).
             * @see https://www.better-auth.com/docs/concepts/rate-limit#connecting-ip-address
             */
            ipAddress: {
                ipAddressHeaders: ['x-real-ip', 'x-forwarded-for'],
            },
            cookiePrefix: 'rumtelo',
            useSecureCookies: isSecureCookieEnv,
            ...(cookieDomain
                ? {
                      crossSubDomainCookies: {
                          enabled: true,
                          // Root domain without leading dot — e.g. `rumtelo.com`
                          domain: cookieDomain.replace(/^\./, ''),
                      },
                  }
                : {}),
            defaultCookieAttributes: {
                httpOnly: true,
                path: '/',
                // Lax is enough for same-site subdomains; None+Secure for stricter browsers
                sameSite: isSecureCookieEnv ? 'none' : 'lax',
                secure: isSecureCookieEnv,
            },
        },
    });
}

export type Auth = ReturnType<typeof createAuth>;
