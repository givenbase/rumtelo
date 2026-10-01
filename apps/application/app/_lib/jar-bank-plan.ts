/**
 * jar-bank-plan — pure planner for the post-onboarding bank setup flow.
 *
 * Takes what the user declared (experience + account count) and returns:
 *   - suggestedAccounts: seats to create (localKey is a stable ID within the plan)
 *   - draftPlacementByJarKey: jar key → localKey pre-mapping
 *   - tipKeys: i18n key suffixes under pages.onboarding — call t(tipKey)
 *
 * nameKey on each account is a key suffix under pages.onboarding; call t(nameKey).
 */

import { AccountKind, BankAccountCount, JarExperience, JarKey } from '@rumtelo/contracts';

export type SuggestedAccount = {
    /** Stable reference key within this plan (not a DB id). */
    localKey: string;
    /** i18n key suffix under pages.onboarding — call t(nameKey) for the display name. */
    nameKey: string;
    kind: AccountKind;
};

export type JarBankPlan = {
    suggestedAccounts: SuggestedAccount[];
    /** Maps JarKey → localKey of the account it should live in. */
    draftPlacementByJarKey: Partial<Record<JarKey, string>>;
    /** i18n key suffixes under pages.onboarding — call t(tipKey). */
    tipKeys: string[];
};

type PlanInput = {
    experience: JarExperience;
    accountCount: BankAccountCount;
    /** Keys of the jars that exist for this household (from the API). */
    jarKeys: JarKey[];
};

export function planJarBankSetup({ experience, accountCount, jarKeys }: PlanInput): JarBankPlan {
    if (experience === JarExperience.NEW) {
        // ── NEW ────────────────────────────────────────────────────────────

        if (accountCount === BankAccountCount.ONE) {
            // One checking; all jars live on it.
            const placement: Partial<Record<JarKey, string>> = {};
            for (const key of jarKeys) placement[key] = 'main';
            return {
                suggestedAccounts: [
                    {
                        localKey: 'main',
                        nameKey: 'banks_setup.suggested_names.main_checking',
                        kind: AccountKind.CHECKING,
                    },
                ],
                draftPlacementByJarKey: placement,
                tipKeys: ['banks_setup.tips.one_account'],
            };
        }

        if (accountCount === BankAccountCount.TWO) {
            // Checking + savings; LTS + Freedom go to savings.
            const savingsKeys = new Set<JarKey>([
                JarKey.LONG_TERM_SAVINGS,
                JarKey.FINANCIAL_FREEDOM,
            ]);
            const placement: Partial<Record<JarKey, string>> = {};
            for (const key of jarKeys) placement[key] = savingsKeys.has(key) ? 'savings' : 'main';
            return {
                suggestedAccounts: [
                    {
                        localKey: 'main',
                        nameKey: 'banks_setup.suggested_names.main_checking',
                        kind: AccountKind.CHECKING,
                    },
                    {
                        localKey: 'savings',
                        nameKey: 'banks_setup.suggested_names.savings',
                        kind: AccountKind.SAVINGS,
                    },
                ],
                draftPlacementByJarKey: placement,
                tipKeys: ['banks_setup.tips.two_accounts'],
            };
        }

        // THREE_PLUS — a dedicated seat per jar (Necessities on checking, rest savings).
        return {
            suggestedAccounts: [
                {
                    localKey: 'main',
                    nameKey: 'banks_setup.suggested_names.main_checking',
                    kind: AccountKind.CHECKING,
                },
                {
                    localKey: 'freedom',
                    nameKey: 'banks_setup.suggested_names.freedom',
                    kind: AccountKind.SAVINGS,
                },
                {
                    localKey: 'lts',
                    nameKey: 'banks_setup.suggested_names.lts',
                    kind: AccountKind.SAVINGS,
                },
                {
                    localKey: 'education',
                    nameKey: 'banks_setup.suggested_names.education',
                    kind: AccountKind.SAVINGS,
                },
                {
                    localKey: 'play',
                    nameKey: 'banks_setup.suggested_names.play',
                    kind: AccountKind.SAVINGS,
                },
                {
                    localKey: 'give',
                    nameKey: 'banks_setup.suggested_names.give',
                    kind: AccountKind.SAVINGS,
                },
            ],
            draftPlacementByJarKey: {
                [JarKey.NECESSITIES]: 'main',
                [JarKey.FINANCIAL_FREEDOM]: 'freedom',
                [JarKey.LONG_TERM_SAVINGS]: 'lts',
                [JarKey.EDUCATION]: 'education',
                [JarKey.PLAY]: 'play',
                [JarKey.GIVE]: 'give',
            },
            tipKeys: ['banks_setup.tips.three_plus'],
        };
    }

    // ── FAMILIAR / SET_UP ──────────────────────────────────────────────────
    // Suggest N blank seats matching count; only pre-map Necessities → seat_0.
    const count =
        accountCount === BankAccountCount.ONE ? 1 : accountCount === BankAccountCount.TWO ? 2 : 3;

    const seats: SuggestedAccount[] = Array.from({ length: count }, (_, i) => ({
        localKey: `seat_${i}`,
        nameKey:
            i === 0
                ? 'banks_setup.suggested_names.main_checking'
                : `banks_setup.suggested_names.seat_${i + 1}`,
        kind: i === 0 ? AccountKind.CHECKING : AccountKind.SAVINGS,
    }));

    const placement: Partial<Record<JarKey, string>> = {};
    if (jarKeys.includes(JarKey.NECESSITIES)) placement[JarKey.NECESSITIES] = 'seat_0';

    return {
        suggestedAccounts: seats,
        draftPlacementByJarKey: placement,
        tipKeys: [
            experience === JarExperience.SET_UP
                ? 'banks_setup.tips.already_set_up'
                : 'banks_setup.tips.familiar',
        ],
    };
}
