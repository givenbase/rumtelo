import { EntityManager, type FilterQuery } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';
import {
    HouseholdAccessSource,
    type HouseholdRole,
    Visibility,
    attributionEnabled,
    canDelete,
    canEdit,
    canShareOnPlan,
    isParticipant,
    sharingModeFor,
    visibilityOptionsFor,
    visibleMakersFor,
    type HouseholdSharingMode,
    type HouseholdVisibilitySettings,
    type VisibilityArea,
    type VisibilityChoice,
    type VisibilityRow,
    type VisibilityScope,
    type VisibilityViewer,
} from '@rumtelo/contracts';

import { HouseholdBillingService } from '../../modules/auth/household/household-billing/household-billing.service';
import { HouseholdSettingsService } from '../../modules/auth/household/household-settings/household-settings.service';
import { AuthMember } from '../../modules/auth/household/managed/member/auth-member.entity';
import { Account } from '../../modules/auth/user/account/account.entity';
import { AccountService } from '../../modules/auth/user/account/account.service';
import type { PersonalHouseholdEntity } from '../database/personal.entity';
import { apiForbidden } from '../errors/api-user-error';

import {
    currentHouseholdContext,
    currentHouseholdId,
    type HouseholdContext,
} from './household.context';
import { householdRelationOf, householdRoleOf } from './membership.service';

/** Everything visibility needs about the current request, loaded once. */
export interface VisibilitySnapshot {
    /** Household plan grants `platform.sharing`. */
    isEntitled: boolean;
    settings: HouseholdVisibilitySettings;
    viewer: VisibilityViewer;
    /** `auth.account` id → seat role, for every seat in the household. */
    makerRoles: ReadonlyMap<string, HouseholdRole>;
    /** OWNER / MEMBER seats that are not EXTERNAL. */
    participantCount: number;
}

/**
 * Applies the household visibility rule to person-attributed rows.
 *
 * Pure rules live in `@rumtelo/contracts` (`visibility.ts`); this service loads the
 * request's inputs (plan, household rule, seats, viewer) once and turns them into
 * MikroORM filters and assertions for `PersonalScopedRepository`.
 *
 * @see docs/engineering/household-visibility-plan.md
 */
@Injectable()
export class VisibilityService {
    /** One snapshot per request — keyed on the request's ALS context object. */
    private readonly snapshots = new WeakMap<HouseholdContext, Promise<VisibilitySnapshot>>();

    constructor(
        @Inject(EntityManager) private readonly em: EntityManager,
        @Inject(HouseholdSettingsService) private readonly settings: HouseholdSettingsService,
        @Inject(HouseholdBillingService) private readonly billing: HouseholdBillingService,
        @Inject(AccountService) private readonly accounts: AccountService
    ) {}

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    snapshot(): Promise<VisibilitySnapshot> {
        const ctx = currentHouseholdContext();
        let pending = this.snapshots.get(ctx);
        if (!pending) {
            pending = this.load(ctx);
            this.snapshots.set(ctx, pending);
        }
        return pending;
    }

    async modeFor(area: VisibilityArea): Promise<HouseholdSharingMode> {
        const snapshot = await this.snapshot();
        return sharingModeFor(area, snapshot.settings, snapshot.isEntitled);
    }

    /** Choices the viewer may pick in this area (empty for viewers and previews). */
    async optionsFor(area: VisibilityArea): Promise<VisibilityChoice[]> {
        const snapshot = await this.snapshot();
        if (!isParticipant(snapshot.viewer)) return [];
        return visibilityOptionsFor({
            role: snapshot.viewer.role,
            mode: sharingModeFor(area, snapshot.settings, snapshot.isEntitled),
        });
    }

    /** "Whose money / paid by" fields — Plus+ with more than one participant. */
    async isAttributionEnabled(): Promise<boolean> {
        const snapshot = await this.snapshot();
        return attributionEnabled({
            isEntitled: snapshot.isEntitled,
            participantCount: snapshot.participantCount,
        });
    }

    /** MikroORM filter: rows of `area` the viewer may see. Combine with the household scope. */
    async filterFor(area: VisibilityArea): Promise<FilterQuery<PersonalHouseholdEntity>> {
        const snapshot = await this.snapshot();
        const makers = visibleMakersFor(snapshot.viewer, scopeFor(area, snapshot));
        const branches: FilterQuery<PersonalHouseholdEntity>[] = [];
        if (makers.isSharedVisible) branches.push({ account: null });
        if (makers.isOwnVisible && snapshot.viewer.accountId) {
            branches.push({ account: snapshot.viewer.accountId });
        }
        for (const visibility of [Visibility.OWNER, Visibility.HOUSEHOLD]) {
            const accountIds = makers.byVisibility[visibility];
            if (accountIds.length > 0) {
                branches.push({ visibility, account: { $in: accountIds } });
            }
        }
        return { $or: branches };
    }

    /** Row-level edit check for DTOs (`canEdit`), without throwing. */
    async editCheckFor(area: VisibilityArea): Promise<(row: VisibilityRow) => boolean> {
        const snapshot = await this.snapshot();
        const mode = sharingModeFor(area, snapshot.settings, snapshot.isEntitled);
        return row => canEdit(snapshot.viewer, row, mode);
    }

    /** Throws unless the viewer may pick `choice` in `area`. */
    async assertChoiceAllowed(area: VisibilityArea, choice: VisibilityChoice): Promise<void> {
        const options = await this.optionsFor(area);
        if (!options.includes(choice)) throw apiForbidden('visibility_choice_not_allowed');
    }

    async assertCanEdit(area: VisibilityArea, row: VisibilityRow): Promise<void> {
        const snapshot = await this.snapshot();
        if (!canEdit(snapshot.viewer, row, await this.modeFor(area))) {
            throw apiForbidden('visibility_edit_forbidden');
        }
    }

    async assertCanDelete(area: VisibilityArea, row: VisibilityRow): Promise<void> {
        const snapshot = await this.snapshot();
        if (!canDelete(snapshot.viewer, row, await this.modeFor(area))) {
            throw apiForbidden('visibility_edit_forbidden');
        }
    }

    /** Viewer's account id, creating the Account row when a seat holder has none yet. */
    async requireViewerAccountId(): Promise<string> {
        const snapshot = await this.snapshot();
        if (snapshot.viewer.accountId) return snapshot.viewer.accountId;
        const { account } = await this.accounts.ensureCurrentAccount();
        return account.id;
    }

    // ====================================================================
    // Private
    // ====================================================================

    private async load(ctx: HouseholdContext): Promise<VisibilitySnapshot> {
        const householdId = currentHouseholdId();
        const [planKey, settings, seats, viewerAccount] = await Promise.all([
            this.billing.getPlanKey(householdId),
            this.settings.visibility(householdId),
            this.em.find(AuthMember, { household: householdId }),
            this.em.findOne(Account, { user: ctx.userId }),
        ]);

        const roleByUser = new Map(
            seats.map(seat => [seat.user.id, householdRoleOf(seat.role)] as const)
        );
        const seatAccounts = await this.em.find(Account, {
            user: { $in: [...roleByUser.keys()] },
        });
        const makerRoles = new Map<string, HouseholdRole>();
        for (const account of seatAccounts) {
            const role = roleByUser.get(account.user.id);
            if (role) makerRoles.set(account.id, role as HouseholdRole);
        }

        const participantCount = seats.filter(seat =>
            isParticipant({
                accountId: null,
                role: householdRoleOf(seat.role) as HouseholdRole,
                relation: householdRelationOf(seat.relation),
                source: HouseholdAccessSource.SEAT,
            })
        ).length;

        return {
            isEntitled: canShareOnPlan(planKey),
            settings,
            viewer: {
                accountId: viewerAccount?.id ?? null,
                role: ctx.role as HouseholdRole,
                relation: ctx.relation,
                source: ctx.source,
            },
            makerRoles,
            participantCount,
        };
    }
}

function scopeFor(area: VisibilityArea, snapshot: VisibilitySnapshot): VisibilityScope {
    return {
        mode: sharingModeFor(area, snapshot.settings, snapshot.isEntitled),
        makerRoles: snapshot.makerRoles,
        // Per-person Practice consent lands with `practice_client_consent` (fase 4):
        // until then a coach sees no personal rows.
        consentingAccountIds: new Set<string>(),
    };
}
