/**
 * jar-bank-plan — pure planner for the post-onboarding bank setup flow.
 *
 * Always starts with one main account. Users add more in the UI; placement
 * after create uses account ids via `jarPlacementForAccounts`.
 */

import { AccountKind, JarExperience, JarKey } from '@rumtelo/contracts';

export type SuggestedAccount = {
    /** i18n key suffix under pages.onboarding — call t(nameKey). */
    nameKey: string;
    kind: AccountKind;
};

export type JarBankPlan = {
    suggestedAccounts: SuggestedAccount[];
    /** i18n key suffixes under pages.onboarding — call t(tipKey). */
    tipKeys: string[];
};

const MAIN_CHECKING: SuggestedAccount = {
    nameKey: 'banks_setup.suggested_names.main_checking',
    kind: AccountKind.CHECKING,
};

export function planJarBankSetup(experience: JarExperience = JarExperience.NEW): JarBankPlan {
    let tipKey: string;
    switch (experience) {
        case JarExperience.SET_UP:
            tipKey = 'banks_setup.tips.already_set_up';
            break;
        case JarExperience.FAMILIAR:
            tipKey = 'banks_setup.tips.familiar';
            break;
        case JarExperience.NEW:
            tipKey = 'banks_setup.tips.one_account';
            break;
    }

    return {
        suggestedAccounts: [MAIN_CHECKING],
        tipKeys: [tipKey],
    };
}

/**
 * After accounts exist, placement uses account ids only.
 * One account → every jar. Several → Necessity on the first (main) account.
 */
export function jarPlacementForAccounts(
    jars: ReadonlyArray<{ id: string; key: JarKey }>,
    accountIds: readonly string[]
): Record<string, string> {
    if (accountIds.length === 0) return {};

    if (accountIds.length === 1) {
        const onlyId = accountIds[0]!;
        const placement: Record<string, string> = {};
        for (const jar of jars) placement[jar.id] = onlyId;
        return placement;
    }

    const mainId = accountIds[0]!;
    const placement: Record<string, string> = {};
    for (const jar of jars) {
        if (jar.key === JarKey.NECESSITIES) placement[jar.id] = mainId;
    }
    return placement;
}
