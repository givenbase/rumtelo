# Entity inventory

Generated from MikroORM metadata (58 entities, 3 implicit pivot tables). Regenerate after entity changes — do not hand-edit tables.

Planes: `auth` = identity (better-auth + Rumtelo person/household rows) · `public` = household-written product data · `backoffice` = Rumtelo-written catalogs. Bases: see `ENTITY_STYLE.md`.

## auth · managed (better-auth writes) (8)

| Entity | Base | Table | File | Relations |
|---|---|---|---|---|
| `AuthHousehold` | `—` | `auth.household` | `modules/auth/household/managed/household/auth-household.entity.ts` | — |
| `AuthInvitation` | `—` | `auth.invitation` | `modules/auth/household/managed/invitation/auth-invitation.entity.ts` | `household` N:1 → AuthHousehold on delete cascade<br>`inviter` N:1 → AuthUser on delete cascade |
| `AuthMember` | `—` | `auth.member` | `modules/auth/household/managed/member/auth-member.entity.ts` | `household` N:1 → AuthHousehold on delete cascade<br>`user` N:1 → AuthUser on delete cascade |
| `AuthProvider` | `—` | `auth.provider` | `modules/auth/user/managed/provider/auth-provider.entity.ts` | `user` N:1 → AuthUser on delete cascade |
| `AuthSession` | `—` | `auth.session` | `modules/auth/user/managed/session/auth-session.entity.ts` | `user` N:1 → AuthUser on delete cascade |
| `AuthTwoFactor` | `—` | `auth.two_factor` | `modules/auth/user/managed/two-factor/auth-two-factor.entity.ts` | `user` N:1 → AuthUser on delete cascade |
| `AuthUser` | `—` | `auth.user` | `modules/auth/user/managed/user/auth-user.entity.ts` | — |
| `AuthVerification` | `—` | `auth.verification` | `modules/auth/user/managed/verification/auth-verification.entity.ts` | — |

## auth · Rumtelo (4)

| Entity | Base | Table | File | Relations |
|---|---|---|---|---|
| `HouseholdBilling` | `HouseholdEntity` | `auth.household_billing` | `modules/auth/household/household-billing/household-billing.entity.ts` | `household` N:1 → AuthHousehold (mapToPk) on delete cascade |
| `HouseholdSettings` | `HouseholdEntity` | `auth.household_settings` | `modules/auth/household/household-settings/household-settings.entity.ts` | `household` N:1 → AuthHousehold (mapToPk) on delete cascade |
| `AccountSettings` | `BaseEntity` | `auth.account_settings` | `modules/auth/user/account/account-settings/account-settings.entity.ts` | `account` 1:1 → Account on delete cascade |
| `Account` | `BaseEntity` | `auth.account` | `modules/auth/user/account/account.entity.ts` | `user` 1:1 → AuthUser on delete cascade<br>`settings` 1:1 → AccountSettings |

## public · platform (1)

| Entity | Base | Table | File | Relations |
|---|---|---|---|---|
| `CoachMessage` | `HouseholdEntity` | `public.platform_coach_message` | `modules/public/platform/coach/coach-message.entity.ts` | `household` N:1 → AuthHousehold (mapToPk) on delete cascade; `account` N:1 → Account (mapToPk, nullable) |

## public · money (14)

| Entity | Base | Table | File | Relations |
|---|---|---|---|---|
| `BankAccount` | `HouseholdEntity` | `public.money_bank_account` | `modules/public/product/money/ledger/bank-account/bank-account.entity.ts` | `household` N:1 → AuthHousehold (mapToPk) on delete cascade |
| `SortRule` | `HouseholdEntity` | `public.money_sort_rule` | `modules/public/product/money/ledger/sort-rule/sort-rule.entity.ts` | `household` N:1 → AuthHousehold (mapToPk) on delete cascade<br>`jar` N:1 → Jar on delete cascade<br>`category` N:1 → Category on delete set null |
| `Transaction` | `HouseholdEntity` | `public.money_transaction` | `modules/public/product/money/ledger/transaction/transaction.entity.ts` | `household` N:1 → AuthHousehold (mapToPk) on delete cascade<br>`account` N:1 → BankAccount on delete set null<br>`jar` N:1 → Jar on delete set null<br>`category` N:1 → Category on delete set null<br>`debt` N:1 → Debt on delete set null<br>`appliedRule` N:1 → SortRule (mapToPk) on delete set null |
| `MonthScoreEvent` | `HouseholdEntity` | `public.money_month_score_event` | `modules/public/product/money/month-score/month-score-event.entity.ts` | `household` N:1 → AuthHousehold (mapToPk) on delete cascade<br>`monthScore` N:1 → MonthScore on delete cascade |
| `MonthScore` | `HouseholdEntity` | `public.money_month_score` | `modules/public/product/money/month-score/month-score.entity.ts` | `household` N:1 → AuthHousehold (mapToPk) on delete cascade<br>`events` 1:N → MonthScoreEvent |
| `FixedCost` | `HouseholdEntity` | `public.money_fixed_cost` | `modules/public/product/money/plan/fixed-cost/fixed-cost.entity.ts` | `household` N:1 → AuthHousehold (mapToPk) on delete cascade<br>`jar` N:1 → Jar on delete cascade<br>`category` N:1 → Category on delete set null<br>`debt` N:1 → Debt on delete set null |
| `FixedCostSettlement` | `HouseholdEntity` | `public.money_fixed_cost_settlement` | `modules/public/product/money/plan/fixed-cost/fixed-cost-settlement.entity.ts` | `household` N:1 → AuthHousehold (mapToPk) on delete cascade<br>`fixedCost` N:1 → FixedCost on delete cascade<br>`transaction` N:1 → Transaction on delete set null |
| `IncomeAmountPeriod` | `HouseholdEntity` | `public.money_income_amount_period` | `modules/public/product/money/plan/income/income-amount-period.entity.ts` | `household` N:1 → AuthHousehold (mapToPk) on delete cascade<br>`incomeSource` N:1 → IncomeSource on delete cascade |
| `IncomeSource` | `HouseholdEntity` | `public.money_income_source` | `modules/public/product/money/plan/income/income-source.entity.ts` | `household` N:1 → AuthHousehold (mapToPk) on delete cascade |
| `Category` | `HouseholdEntity` | `public.money_category` | `modules/public/product/money/plan/jar/category.entity.ts` | `household` N:1 → AuthHousehold (mapToPk) on delete cascade<br>`jar` N:1 → Jar on delete cascade |
| `Jar` | `HouseholdEntity` | `public.money_jar` | `modules/public/product/money/plan/jar/jar.entity.ts` | `household` N:1 → AuthHousehold (mapToPk) on delete cascade<br>`categories` 1:N → Category |
| `Debt` | `HouseholdEntity` | `public.money_debt` | `modules/public/product/money/targets/debt/debt.entity.ts` | `household` N:1 → AuthHousehold (mapToPk) on delete cascade |
| `Goal` | `HouseholdEntity` | `public.money_goal` | `modules/public/product/money/targets/goal/goal.entity.ts` | `household` N:1 → AuthHousehold (mapToPk) on delete cascade<br>`jar` N:1 → Jar on delete set null |
| `MoneyWeekCheck` | `WeekCheckEntity` | `public.money_week_check` | `modules/public/product/money/week-check/money-week-check.entity.ts` | `household` N:1 → AuthHousehold (mapToPk) on delete cascade<br>`allocations` 1:N → WeekCheckAllocation |
| `WeekCheckAllocation` | `HouseholdEntity` | `public.money_week_check_allocation` | `modules/public/product/money/week-check/week-check-allocation.entity.ts` | `household` N:1 → AuthHousehold (mapToPk) on delete cascade<br>`weekCheck` N:1 → MoneyWeekCheck on delete cascade<br>`jar` N:1 → Jar on delete cascade |

## public · growth (3)

| Entity | Base | Table | File | Relations |
|---|---|---|---|---|
| `IncomeLever` | `HouseholdEntity` | `public.growth_income_lever` | `modules/public/product/growth/income-lever/income-lever.entity.ts` | `household` N:1 → AuthHousehold (mapToPk) on delete cascade |
| `IncomeMilestone` | `HouseholdEntity` | `public.growth_income_milestone` | `modules/public/product/growth/income-milestone/income-milestone.entity.ts` | `household` N:1 → AuthHousehold (mapToPk) on delete cascade |
| `GrowthWeekCheck` | `WeekCheckEntity` | `public.growth_week_check` | `modules/public/product/growth/week-check/growth-week-check.entity.ts` | `household` N:1 → AuthHousehold (mapToPk) on delete cascade |

## public · energy (2)

| Entity | Base | Table | File | Relations |
|---|---|---|---|---|
| `EnergyLog` | `HouseholdEntity` | `public.energy_log` | `modules/public/product/energy/log/energy-log.entity.ts` | `household` N:1 → AuthHousehold (mapToPk) on delete cascade<br>`account` N:1 → Account (mapToPk) on delete cascade |
| `EnergyWeekCheck` | `WeekCheckEntity` | `public.energy_week_check` | `modules/public/product/energy/week-check/energy-week-check.entity.ts` | `household` N:1 → AuthHousehold (mapToPk) on delete cascade |

## public · soul (2)

| Entity | Base | Table | File | Relations |
|---|---|---|---|---|
| `Gratitude` | `HouseholdEntity` | `public.soul_gratitude` | `modules/public/product/soul/gratitude/gratitude.entity.ts` | `household` N:1 → AuthHousehold (mapToPk) on delete cascade<br>`account` N:1 → Account (mapToPk) on delete cascade |
| `SoulWeekCheck` | `WeekCheckEntity` | `public.soul_week_check` | `modules/public/product/soul/week-check/soul-week-check.entity.ts` | `household` N:1 → AuthHousehold (mapToPk) on delete cascade |

## backoffice · money (16)

| Entity | Base | Table | File | Relations |
|---|---|---|---|---|
| `Audience` | `CatalogEntity` | `backoffice.reference_money_audience` | `modules/backoffice/product/money/catalog/audience/audience.entity.ts` | — |
| `GivingOrganisation` | `CatalogEntity` | `backoffice.reference_money_giving_organisation` | `modules/backoffice/product/money/catalog/giving-organisation/giving-organisation.entity.ts` | — |
| `Market` | `CatalogEntity` | `backoffice.reference_money_market` | `modules/backoffice/product/money/catalog/market/market.entity.ts` | — |
| `DebtPresetMerchant` | `BaseEntity` | `backoffice.reference_money_debt_preset_merchant` | `modules/backoffice/product/money/preset/debt/debt-merchant.entity.ts` | `preset` N:1 → DebtPreset on delete cascade<br>`merchant` N:1 → MerchantPreset on delete cascade |
| `DebtPreset` | `CatalogEntity` | `backoffice.reference_money_debt_preset` | `modules/backoffice/product/money/preset/debt/debt.entity.ts` | `merchantLinks` 1:N → DebtPresetMerchant |
| `FixedCostPresetMerchant` | `BaseEntity` | `backoffice.reference_money_fixed_cost_preset_merchant` | `modules/backoffice/product/money/preset/fixed-cost/fixed-cost-merchant.entity.ts` | `preset` N:1 → FixedCostPreset on delete cascade<br>`merchant` N:1 → MerchantPreset on delete cascade |
| `FixedCostPreset` | `CatalogEntity` | `backoffice.reference_money_fixed_cost_preset` | `modules/backoffice/product/money/preset/fixed-cost/fixed-cost.entity.ts` | `jarTemplate` N:1 → JarTemplate on delete restrict<br>`categoryTemplate` N:1 → CategoryTemplate on delete restrict<br>`audiences` N:M → Audience<br>`merchantLinks` 1:N → FixedCostPresetMerchant |
| `GoalPreset` | `CatalogEntity` | `backoffice.reference_money_goal_preset` | `modules/backoffice/product/money/preset/goal/goal.entity.ts` | `jarTemplate` N:1 → JarTemplate on delete restrict<br>`categoryTemplate` N:1 → CategoryTemplate on delete set null |
| `IncomeSourcePreset` | `CatalogEntity` | `backoffice.reference_money_income_source_preset` | `modules/backoffice/product/money/preset/income/income.entity.ts` | — |
| `MerchantBanking` | `BaseEntity` | `backoffice.reference_money_merchant_banking` | `modules/backoffice/product/money/preset/merchant/merchant-banking.entity.ts` | `preset` 1:1 → MerchantPreset on delete cascade |
| `MerchantBranding` | `BaseEntity` | `backoffice.reference_money_merchant_branding` | `modules/backoffice/product/money/preset/merchant/merchant-branding.entity.ts` | `preset` 1:1 → MerchantPreset on delete cascade |
| `MerchantMatching` | `BaseEntity` | `backoffice.reference_money_merchant_matching` | `modules/backoffice/product/money/preset/merchant/merchant-matching.entity.ts` | `preset` 1:1 → MerchantPreset on delete cascade |
| `MerchantPreset` | `CatalogEntity` | `backoffice.reference_money_merchant_preset` | `modules/backoffice/product/money/preset/merchant/merchant.entity.ts` | `jarTemplate` N:1 → JarTemplate on delete restrict<br>`categoryTemplate` N:1 → CategoryTemplate on delete restrict<br>`givingOrganisation` N:1 → GivingOrganisation on delete set null<br>`markets` N:M → Market<br>`matching` 1:1 → MerchantMatching<br>`branding` 1:1 → MerchantBranding<br>`banking` 1:1 → MerchantBanking |
| `TransactionInPreset` | `CatalogEntity` | `backoffice.reference_money_transaction_in_preset` | `modules/backoffice/product/money/preset/transaction-in/transaction-in.entity.ts` | — |
| `CategoryTemplate` | `CatalogEntity` | `backoffice.reference_money_category_template` | `modules/backoffice/product/money/template/category/category.entity.ts` | `jarTemplate` N:1 → JarTemplate on delete restrict |
| `JarTemplate` | `BaseEntity` | `backoffice.reference_money_jar_template` | `modules/backoffice/product/money/template/jar/jar.entity.ts` | — |

## backoffice · growth (3)

| Entity | Base | Table | File | Relations |
|---|---|---|---|---|
| `IncomePosture` | `CatalogEntity` | `backoffice.reference_growth_income_posture` | `modules/backoffice/product/growth/catalog/income-posture/income-posture.entity.ts` | — |
| `WealthStage` | `CatalogEntity` | `backoffice.reference_growth_wealth_stage` | `modules/backoffice/product/growth/catalog/wealth-stage/wealth-stage.entity.ts` | — |
| `LeverPreset` | `CatalogEntity` | `backoffice.reference_growth_lever_preset` | `modules/backoffice/product/growth/preset/lever/lever.entity.ts` | `minWealthStage` N:1 → WealthStage on delete restrict<br>`postures` N:M → IncomePosture |

## backoffice · plan (5)

| Entity | Base | Table | File | Relations |
|---|---|---|---|---|
| `PlanCapabilityGrant` | `BaseEntity` | `backoffice.plan_capability_grant` | `modules/backoffice/plan/plan-capability-grant/plan-capability-grant.entity.ts` | `plan` N:1 → Plan on delete cascade<br>`capability` N:1 → PlanCapability on delete cascade |
| `PlanCapability` | `CatalogEntity` | `backoffice.plan_capability` | `modules/backoffice/plan/plan-capability/plan-capability.entity.ts` | `feature` N:1 → PlanFeature on delete cascade<br>`grants` 1:N → PlanCapabilityGrant |
| `PlanFeature` | `CatalogEntity` | `backoffice.plan_feature` | `modules/backoffice/plan/plan-feature/plan-feature.entity.ts` | `product` N:1 → PlanProduct on delete cascade<br>`capabilities` 1:N → PlanCapability |
| `PlanProduct` | `CatalogEntity` | `backoffice.plan_product` | `modules/backoffice/plan/plan-product/plan-product.entity.ts` | `features` 1:N → PlanFeature |
| `Plan` | `BaseEntity` | `backoffice.plan` | `modules/backoffice/plan/plan.entity.ts` | `grants` 1:N → PlanCapabilityGrant |

## Implicit pivot tables (`@ManyToMany`)

- `backoffice.reference_growth_lever_preset_income_posture`
- `backoffice.reference_money_fixed_cost_preset_audience`
- `backoffice.reference_money_merchant_preset_market`

## Reference policy

| From → to | Storage |
|---|---|
| backoffice → backoffice | relation (id FK / pivot entity) |
| household → backoffice | `*Key` snapshot string (`Jar.templateKey`, `Goal.givingOrganisationKey`, `Transaction.inflowKey`, `FixedCost.presetKey`) |
| household → household | relation with explicit `deleteRule` |
