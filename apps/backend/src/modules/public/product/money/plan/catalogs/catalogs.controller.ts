import { Inject } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';
import type { DebtKind, GivingCause, IncomeKind, JarKey } from '@rumtelo/contracts';
import { GIVING_CAUSE_CATALOG, GIVING_EVALUATOR_CATALOG, contract } from '@rumtelo/contracts';

import { ControllerSwagger } from '../../../../../../common/decorators/controller-swagger.decorators';
import { AccountSettingsService } from '../../../../../auth/user/account/account-settings';
import {
    catalogLocaleFromContracts,
    ENTITY_GIVING_CAUSE,
    isCatalogSourceLocale,
    TranslationService,
} from '../../../../../backoffice/admin/translation';
import {
    AudienceService,
    CategoryTemplateService,
    DebtPresetService,
    FixedCostPresetService,
    GivingOrganisationService,
    GoalPresetService,
    IncomeSourcePresetService,
    JarTemplateService,
    MerchantPresetService,
    TransactionInPresetService,
} from '../../../../../backoffice/product';

@ControllerSwagger('money/catalogs', 'public')
export class MoneyCatalogsController {
    constructor(
        @Inject(JarTemplateService) private readonly jars: JarTemplateService,
        @Inject(CategoryTemplateService) private readonly categories: CategoryTemplateService,
        @Inject(AudienceService) private readonly audiences: AudienceService,
        @Inject(FixedCostPresetService) private readonly fixedCosts: FixedCostPresetService,
        @Inject(DebtPresetService) private readonly debts: DebtPresetService,
        @Inject(IncomeSourcePresetService) private readonly incomes: IncomeSourcePresetService,
        @Inject(TransactionInPresetService)
        private readonly transactionIns: TransactionInPresetService,
        @Inject(GoalPresetService) private readonly goals: GoalPresetService,
        @Inject(MerchantPresetService) private readonly merchants: MerchantPresetService,
        @Inject(GivingOrganisationService)
        private readonly givingOrganisations: GivingOrganisationService,
        @Inject(AccountSettingsService) private readonly accountSettings: AccountSettingsService,
        @Inject(TranslationService) private readonly translations: TranslationService
    ) {}

    @Implement(contract.money.catalogs.jarTemplates.list)
    listJarTemplates() {
        return implement(contract.money.catalogs.jarTemplates.list).handler(async () => {
            const { locale } = await this.accountSettings.get();
            const rows = await this.jars.listActive(locale);
            return rows.map(template => ({
                key: template.key,
                name: template.name,
                sortOrder: template.sortOrder,
                subtitle: template.subtitle,
                icon: template.icon,
                percentage: Number(template.percentage),
                capabilities: template.capabilities,
                guide: template.guide,
            }));
        });
    }

    @Implement(contract.money.catalogs.categoryTemplates.list)
    listCategoryTemplates() {
        return implement(contract.money.catalogs.categoryTemplates.list).handler(
            async ({ input }) => {
                const { locale } = await this.accountSettings.get();
                const rows = await this.categories.listActive({
                    jarKey: (input.jarKey as JarKey | null) ?? undefined,
                    locale,
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
                const { locale } = await this.accountSettings.get();
                const rows = await this.fixedCosts.listActive({
                    jarKey: (input.jarKey as JarKey | null) ?? undefined,
                    categoryTemplateKey: input.categoryTemplateKey ?? undefined,
                    audienceKey: input.audienceKey ?? undefined,
                    locale,
                });
                return rows.map(preset => ({
                    key: preset.key,
                    name: preset.name,
                    sortOrder: preset.sortOrder,
                    jarKey: preset.jarTemplate.key,
                    categoryTemplateKey: preset.categoryTemplate.key,
                    cadence: preset.cadence,
                    dueDay: preset.dueDay,
                    direction: preset.direction,
                    audienceKeys: preset.audiences.getItems().map(audience => audience.key),
                    merchantKeys: preset.merchantLinks.getItems().map(link => link.merchant.key),
                }));
            }
        );
    }

    @Implement(contract.money.catalogs.audiences.list)
    listAudiences() {
        return implement(contract.money.catalogs.audiences.list).handler(async () => {
            const { locale } = await this.accountSettings.get();
            const rows = await this.audiences.listActive(locale);
            return rows.map(row => ({
                key: row.key,
                name: row.name,
                sortOrder: row.sortOrder,
                description: row.description,
                isBaseline: row.isBaseline,
                icon: row.icon,
                accentColor: row.accentColor,
                softColor: row.softColor,
            }));
        });
    }

    @Implement(contract.money.catalogs.debtPresets.list)
    listDebtPresets() {
        return implement(contract.money.catalogs.debtPresets.list).handler(async ({ input }) => {
            const { locale } = await this.accountSettings.get();
            const rows = await this.debts.listActive({
                kind: (input.kind as DebtKind | null) ?? undefined,
                locale,
            });
            return rows.map(preset => ({
                key: preset.key,
                name: preset.name,
                sortOrder: preset.sortOrder,
                kind: preset.kind,
                icon: preset.icon,
                merchantKeys: preset.merchantLinks.getItems().map(link => link.merchant.key),
            }));
        });
    }

    @Implement(contract.money.catalogs.incomeSourcePresets.list)
    listIncomeSourcePresets() {
        return implement(contract.money.catalogs.incomeSourcePresets.list).handler(
            async ({ input }) => {
                const { locale } = await this.accountSettings.get();
                const rows = await this.incomes.listActive({
                    kind: (input.kind as IncomeKind | null) ?? undefined,
                    locale,
                });
                return rows.map(preset => ({
                    key: preset.key,
                    name: preset.name,
                    sortOrder: preset.sortOrder,
                    kind: preset.kind,
                    cadence: preset.cadence,
                    icon: preset.icon,
                }));
            }
        );
    }

    @Implement(contract.money.catalogs.transactionInPresets.list)
    listTransactionInPresets() {
        return implement(contract.money.catalogs.transactionInPresets.list).handler(async () => {
            const { locale } = await this.accountSettings.get();
            const rows = await this.transactionIns.listActive(locale);
            return rows.map(preset => ({
                key: preset.key,
                name: preset.name,
                sortOrder: preset.sortOrder,
                groupName: preset.groupName,
                icon: preset.icon,
                jarKey: preset.jarKey,
            }));
        });
    }

    @Implement(contract.money.catalogs.goalPresets.list)
    listGoalPresets() {
        return implement(contract.money.catalogs.goalPresets.list).handler(async ({ input }) => {
            const { locale } = await this.accountSettings.get();
            const rows = await this.goals.listActive({
                jarKey: (input.jarKey as JarKey | null) ?? undefined,
                locale,
            });
            return rows.map(preset => ({
                key: preset.key,
                name: preset.name,
                sortOrder: preset.sortOrder,
                jarKey: preset.jarTemplate.key,
                categoryTemplateKey: preset.categoryTemplate?.key ?? null,
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
                    categoryTemplateKey: preset.categoryTemplate.key,
                    givingOrganisationKey: preset.givingOrganisation?.key ?? null,
                    logoDomain: preset.branding?.logoDomain ?? null,
                    website: preset.branding?.website ?? null,
                    ibanBankCode: preset.banking?.ibanBankCode ?? null,
                    highlight: preset.highlight ?? null,
                    markets: preset.markets.getItems().map(market => market.key),
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

    @Implement(contract.money.catalogs.givingCauses.list)
    listGivingCauses() {
        return implement(contract.money.catalogs.givingCauses.list).handler(async () => {
            const { locale } = await this.accountSettings.get();
            const catalogLocale = catalogLocaleFromContracts(locale);
            const rows = GIVING_CAUSE_CATALOG.map((row, sortOrder) => ({
                key: row.key,
                name: row.name,
                sortOrder,
                icon: row.icon,
                line: row.line,
            }));
            if (isCatalogSourceLocale(catalogLocale)) return rows;

            const fieldMap = await this.translations.fieldMapForType(
                ENTITY_GIVING_CAUSE,
                catalogLocale,
                rows.map(row => row.key)
            );
            return this.translations.applyToMany(rows, fieldMap, ['name', 'line'], row =>
                String(row.key)
            ) as typeof rows;
        });
    }

    @Implement(contract.money.catalogs.givingEvaluators.list)
    listGivingEvaluators() {
        return implement(contract.money.catalogs.givingEvaluators.list).handler(() =>
            GIVING_EVALUATOR_CATALOG.map((row, sortOrder) => ({
                key: row.key,
                name: row.name,
                sortOrder,
                tier: row.tier,
                measures: row.measures,
                url: row.url,
            }))
        );
    }
}
