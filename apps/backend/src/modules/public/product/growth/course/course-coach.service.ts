import { Inject, Injectable } from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import {
    CAPABILITIES,
    COURSE_COACH_KEY_PREFIX,
    CoachFeatureId,
    CoachKind,
    CourseHorizon,
    RHYTHM_QUIET_DAYS,
    addDays,
    coursePeriodOf,
    hasCapability,
    isCountingRhythm,
    isCoachFeatureEnabledAtLaunch,
} from '@rumtelo/contracts';

import { PlanAccessService } from '../../../../../common/capability';
import { VisibilityService } from '../../../../../common/household/visibility.service';
import { currentWeek } from '../../../../../common/utils/period.util';
import { AccountSettings } from '../../../../auth/user/account/account-settings/account-settings.entity';
import { CoachService, type CoachDraft } from '../../../platform/coach/coach.service';
import { CourseService } from './course.service';
import { feedLanguageOf, type FeedLanguage } from './course-ics.util';
import { RhythmService } from './rhythm.service';

/** Routines live in Course › Week — the week you are in. */
const weekHref = () => `/product/growth/course/${currentWeek()}`;

const COPY: Record<
    FeedLanguage,
    {
        quiet: (name: string, days: number) => string;
        quietCta: string;
        counter: (name: string) => string;
        counterCta: string;
    }
> = {
    en: {
        quiet: (name, days) =>
            `${name} has had no tick for ${days} days. Pause it, or make it smaller?`,
        quietCta: 'Open this week',
        counter: name => `What discipline brings "${name}" closer? Add one and every tick counts.`,
        counterCta: 'Add a discipline',
    },
    nl: {
        quiet: (name, days) =>
            `${name} heeft al ${days} dagen geen vinkje. Pauzeren, of kleiner maken?`,
        quietCta: 'Open deze week',
        counter: name =>
            `Welke discipline brengt "${name}" dichterbij? Voeg er één toe; elk vinkje telt.`,
        counterCta: 'Discipline toevoegen',
    },
};

/**
 * Course tips for The Coach, one next move each, never shame:
 * - a running routine with no tick for {@link RHYTHM_QUIET_DAYS} days → pause or smaller;
 * - this month's counted milestone with no routine under it → add one.
 * Copy is written in the person's language (keys carry ids only, no names).
 */
@Injectable()
export class CourseCoachService implements OnModuleInit {
    constructor(
        @Inject(EntityManager) private readonly em: EntityManager,
        @Inject(CoachService) private readonly coach: CoachService,
        @Inject(PlanAccessService) private readonly planAccess: PlanAccessService,
        @Inject(VisibilityService) private readonly visibility: VisibilityService,
        @Inject(CourseService) private readonly course: CourseService,
        @Inject(RhythmService) private readonly rhythms: RhythmService
    ) {}

    onModuleInit(): void {
        this.coach.registerRefresher(() => this.refresh());
    }

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    async refresh(today = new Date().toISOString().slice(0, 10)): Promise<void> {
        if (
            !isCoachFeatureEnabledAtLaunch(CoachFeatureId.GROWTH_TIP_PRODUCERS, {
                nodeEnv: process.env.NODE_ENV,
            })
        ) {
            return;
        }
        const planKey = await this.planAccess.planKeyForCurrentHousehold();
        if (!hasCapability(CAPABILITIES.growthCourse, planKey)) return;

        const accountId = (await this.visibility.snapshot()).viewer.accountId;
        if (!accountId) return;
        const settings = await this.em.findOne(AccountSettings, { account: accountId });
        const copy = COPY[feedLanguageOf(settings?.locale)];

        const [view, monthItems] = await Promise.all([
            this.rhythms.list({ week: currentWeek(), accountId }),
            this.course.inPeriods(CourseHorizon.MONTH, [
                coursePeriodOf(CourseHorizon.MONTH, new Date(`${today}T00:00:00Z`)),
            ]),
        ]);

        const drafts: CoachDraft[] = [];
        const quietSince = addDays(today, -RHYTHM_QUIET_DAYS);
        const candidates = view.rhythms.filter(
            rhythm =>
                rhythm.isMine &&
                !rhythm.isPaused &&
                (rhythm.lastTickOn === null || rhythm.lastTickOn < quietSince)
        );
        // Never ticked and made within the quiet window: new, not quiet.
        const isOldEnough = await Promise.all(
            candidates.map(rhythm =>
                rhythm.lastTickOn !== null
                    ? Promise.resolve(true)
                    : this.isOlderThan(rhythm.id, quietSince)
            )
        );
        for (const [index, rhythm] of candidates.entries()) {
            if (!isOldEnough[index]) continue;
            drafts.push({
                key: `${COURSE_COACH_KEY_PREFIX}rhythm_quiet:${rhythm.id}`,
                kind: CoachKind.NUDGE,
                text: copy.quiet(rhythm.name, RHYTHM_QUIET_DAYS),
                ctaLabel: copy.quietCta,
                ctaHref: weekHref(),
            });
        }

        // Only a discipline fills a counter; a habit under it leaves the counter empty.
        const fed = new Set(
            view.rhythms
                .filter(rhythm => isCountingRhythm(rhythm.kind))
                .map(rhythm => rhythm.parentId)
                .filter(Boolean)
        );
        for (const item of monthItems) {
            if (!item.isMine || item.targetCount === null || fed.has(item.id)) continue;
            drafts.push({
                key: `${COURSE_COACH_KEY_PREFIX}counter_without_rhythm:${item.id}`,
                kind: CoachKind.NUDGE,
                text: copy.counter(item.name),
                ctaLabel: copy.counterCta,
                ctaHref: weekHref(),
            });
        }

        await this.coach.sync(accountId, COURSE_COACH_KEY_PREFIX, drafts);
    }

    // Private

    /** A routine made fewer than the quiet days ago is not quiet yet — it is new. */
    private async isOlderThan(rhythmId: string, isoDate: string): Promise<boolean> {
        return this.rhythms.createdBefore(rhythmId, new Date(`${isoDate}T00:00:00Z`));
    }
}
