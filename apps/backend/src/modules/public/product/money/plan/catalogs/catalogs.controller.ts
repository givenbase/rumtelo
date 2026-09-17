import { Inject } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';
import { contract } from '@rumtelo/contracts';

import { ControllerSwagger } from '../../../../../../common/decorators/controller-swagger.decorators';
import {
    CategoryTemplateService,
    DebtPresetService,
    FixedCostPresetService,
    GivingOrganisationService,
    GoalPresetService,
    IncomeSourcePresetService,
    MerchantPresetService,
} from '../../../../../backoffice/product';
import type { DebtKind, GivingCause, IncomeKind, JarKey } from '@rumtelo/contracts';

@ControllerSwagger('money/catalogs', 'public')
export class MoneyCatalogsController {
    constructor(
        @Inject(CategoryTemplateService) private readonly categories: CategoryTemplateService,
        @Inject(FixedCostPresetService) private readonly fixedCosts: FixedCostPresetService,
        @Inject(DebtPresetService) private readonly debts: DebtPresetService,
        @Inject(IncomeSourcePresetService) private readonly incomes: IncomeSourcePresetService,
        @Inject(GoalPresetService) private readonly goals: GoalPresetService,
        @Inject(MerchantPresetService) private readonly merchants: MerchantPresetService,
        @Inject(GivingOrganisationService)
        private readonly givingOrganisations: GivingOrganisationService
    ) {}

    @Implement(contract.money.catalogs.categoryTemplates.list)
    listCategoryTemplates() {
        return implement(contract.money.catalogs.categoryTemplates.list).handler(
            async ({ input }) => {
                const rows = await this.categories.listActive({
                    jarKey: (input.jarKey as JarKey | null) ?? undefined,
                });
                return rows.map(template => ({
                    key: template.key,
                    name: template.name,
                    sortOrder: template.sortOrder,
                    jarKey: template.jarTemplate.key,
                    icon: template.icon,
                }));
            }
        );
    }

    @Implement(contract.money.catalogs.fixedCostPresets.list)
    listFixedCostPresets() {
        return implement(contract.money.catalogs.fixedCostPresets.list).handler(
            async ({ input }) => {
                const rows = await this.fixedCosts.listActive({
                    jarKey: (input.jarKey as JarKey | null) ?? undefined,
                    categoryTemplateKey: input.categoryTemplateKey ?? undefined,
                    audienceTag: input.audienceTag ?? undefined,
                });
                return rows.map(preset => ({
                    key: preset.key,
                    name: preset.name,
                    sortOrder: preset.sortOrder,
                    jarKey: preset.jarTemplate.key,
                    categoryTemplateKey: preset.categoryTemplateKey,
                    defaultCadence: preset.defaultCadence,
                    suggestedDueDay: preset.suggestedDueDay,
                    direction: preset.direction,
                    audienceTags: preset.audienceTags,
                    suggestedMerchantKeys: preset.suggestedMerchantKeys ?? [],
                }));
            }
        );
    }

    @Implement(contract.money.catalogs.debtPresets.list)
    listDebtPresets() {
        return implement(contract.money.catalogs.debtPresets.list).handler(async ({ input }) => {
            const rows = await this.debts.listActive({
                kind: (input.kind as DebtKind | null) ?? undefined,
            });
            return rows.map(preset => ({
                key: preset.key,
                name: preset.name,
                sortOrder: preset.sortOrder,
                kind: preset.kind,
                icon: preset.icon,
                suggestedLenders: preset.suggestedLenders ?? [],
            }));
        });
    }

    @Implement(contract.money.catalogs.incomeSourcePresets.list)
    listIncomeSourcePresets() {
        return implement(contract.money.catalogs.incomeSourcePresets.list).handler(
            async ({ input }) => {
                const rows = await this.incomes.listActive({
                    kind: (input.kind as IncomeKind | null) ?? undefined,
                });
                return rows.map(preset => ({
                    key: preset.key,
                    name: preset.name,
                    sortOrder: preset.sortOrder,
                    kind: preset.kind,
                    defaultCadence: preset.defaultCadence,
                    icon: preset.icon ?? null,
                }));
            }
        );
    }

    @Implement(contract.money.catalogs.goalPresets.list)
    listGoalPresets() {
        return implement(contract.money.catalogs.goalPresets.list).handler(async ({ input }) => {
            const rows = await this.goals.listActive({
                jarKey: (input.jarKey as JarKey | null) ?? undefined,
            });
            return rows.map(preset => ({
                key: preset.key,
                name: preset.name,
                sortOrder: preset.sortOrder,
                jarKey: preset.jarTemplate.key,
                categoryTemplateKey: preset.categoryTemplateKey,
                icon: preset.icon,
            }));
        });
    }

    @Implement(contract.money.catalogs.merchantPresets.list)
    listMerchantPresets() {
        return implement(contract.money.catalogs.merchantPresets.list).handler(
            async ({ input }) => {
                const rows = await this.merchants.listActive({
                    jarKey: (input.jarKey as JarKey | null) ?? undefined,
                    categoryTemplateKey: input.categoryTemplateKey ?? undefined,
                    mcc: input.mcc ?? undefined,
                    market: input.market ?? undefined,
                });
                return rows.map(preset => ({
                    key: preset.key,
                    name: preset.name,
                    sortOrder: preset.sortOrder,
                    matchValue: preset.matching?.matchValue ?? preset.name,
                    aliases: preset.matching?.aliases ?? [],
                    mcc: preset.matching?.mcc ?? null,
                    jarKey: preset.jarTemplate.key,
                    categoryTemplateKey: preset.categoryTemplateKey,
                    logoDomain: preset.branding?.logoDomain ?? null,
                    website: preset.branding?.website ?? null,
                    ibanBankCode: preset.banking?.ibanBankCode ?? null,
                    highlight: preset.highlight ?? null,
                    markets: preset.markets?.length ? preset.markets : ['NL'],
                    matchPriority: preset.matching?.matchPriority ?? 0,
                    providerIds: preset.matching?.providerIds ?? {},
                }));
            }
        );
    }

    @Implement(contract.money.catalogs.givingOrganisations.list)
    listGivingOrganisations() {
        return implement(contract.money.catalogs.givingOrganisations.list).handler(({ input }) =>
            this.givingOrganisations.listActive({
                cause: (input.cause as GivingCause | null) ?? undefined,
            })
        );
    }
}
