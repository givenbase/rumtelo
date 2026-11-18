import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';
import {
    CourseLane,
    CourseScheduleKind,
    HouseholdAccessSource,
    MONTH_CLOSE_DEFAULT_LEAD_DAYS,
    addDays,
    type CourseFeedSettings,
    type CourseFeedUpdateInput,
    type CourseScheduleEntry,
} from '@rumtelo/contracts';

import { loadEnv } from '../../../../../common/config/env.config';
import { apiNotFound } from '../../../../../common/errors/api-user-error';
import { HouseholdScopedRepository } from '../../../../../common/household/household-scoped.repository';
import { householdStorage } from '../../../../../common/household/household.context';
import { MembershipService } from '../../../../../common/household/membership.service';
import { VisibilityService } from '../../../../../common/household/visibility.service';
import { AccountSettings } from '../../../../auth/user/account/account-settings/account-settings.entity';
import { Account } from '../../../../auth/user/account/account.entity';
import { CourseScheduleService } from './course-schedule.service';
import { feedLanguageOf, renderCourseCalendar } from './course-ics.util';
import { GrowthCourseFeed } from './growth-course-feed.entity';

/** Feed window: four weeks back, eight weeks ahead. */
const FEED_DAYS_BACK = 28;
const FEED_DAYS_AHEAD = 56;
/** Calendars poll; one render serves every poll in this window. */
const FEED_CACHE_MS = 5 * 60_000;
/** Write `lastFetchedAt` at most this often. */
const FETCH_STAMP_MS = 60 * 60_000;
/** 32 bytes, base64url without padding. */
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

/**
 * Course › calendar mirror (ICS). One secret address per person; Rumtelo writes,
 * Google / Apple / Outlook show. Ticking stays in Rumtelo.
 *
 * The token is an HMAC of the row id and `version` with the server secret, so the
 * address can be shown again without storing it, and a database copy alone cannot
 * open a feed. The table keeps only the token's SHA-256 for the lookup.
 */
@Injectable()
export class CourseFeedService {
    private readonly feeds: HouseholdScopedRepository<GrowthCourseFeed>;
    private readonly cache = new Map<string, { expiresAt: number; body: string }>();

    constructor(
        @Inject(EntityManager) private readonly em: EntityManager,
        @Inject(VisibilityService) private readonly visibility: VisibilityService,
        @Inject(MembershipService) private readonly membership: MembershipService,
        @Inject(CourseScheduleService) private readonly schedule: CourseScheduleService
    ) {
        this.feeds = new HouseholdScopedRepository(em, GrowthCourseFeed);
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    async get(): Promise<CourseFeedSettings> {
        const feed = await this.mine();
        return feed ? this.toDto(feed) : defaultSettings();
    }

    /**
     * The ICS document behind a secret address, or null when the address is unknown,
     * switched off, rotated away, or its person left the household. Runs as that
     * person, so they see exactly what Course › Schedule shows them.
     */
    async renderByToken(token: string, now = new Date()): Promise<string | null> {
        if (!TOKEN_PATTERN.test(token)) return null;
        const tokenHash = sha256(token);

        const cached = this.cache.get(tokenHash);
        if (cached && cached.expiresAt > now.getTime()) return cached.body;

        const em = this.em.fork();
        const feed = await em.findOne(GrowthCourseFeed, { tokenHash, isEnabled: true });
        if (!feed || !safeEqual(tokenFor(feed), token)) return null;

        const account = await em.findOne(Account, { id: feed.account }, { populate: ['user'] });
        if (!account) return null;
        const userId = account.user.id;
        const seat = await this.membership.seatFor(userId, feed.household);
        if (!seat) return null;
        const settings = await em.findOne(AccountSettings, { account: feed.account });

        const today = now.toISOString().slice(0, 10);
        const body = await householdStorage.run(
            {
                userId,
                householdId: feed.household,
                ...seat,
                source: HouseholdAccessSource.SEAT,
            },
            async () => {
                const view = await this.schedule.list(
                    addDays(today, -FEED_DAYS_BACK),
                    addDays(today, FEED_DAYS_AHEAD),
                    today
                );
                return renderCourseCalendar({
                    entries: view.entries.filter(entry => isShown(entry, feed)),
                    language: feedLanguageOf(settings?.locale),
                    appUrl: loadEnv().DOMAIN_APP,
                    now,
                });
            }
        );

        this.cache.set(tokenHash, { expiresAt: now.getTime() + FEED_CACHE_MS, body });
        if (!feed.lastFetchedAt || now.getTime() - feed.lastFetchedAt.getTime() > FETCH_STAMP_MS) {
            feed.lastFetchedAt = now;
            await em.flush();
        }
        return body;
    }

    // ====================================================================
    // ? UPDATE Operations
    // ====================================================================

    /** Switch on; the first call creates the address. */
    async enable(): Promise<CourseFeedSettings> {
        let feed = await this.mine();
        if (!feed) {
            const accountId = await this.visibility.requireViewerAccountId();
            feed = this.feeds.create({
                account: accountId,
                version: 1,
                tokenHash: 'pending',
                monthCloseLeadDays: MONTH_CLOSE_DEFAULT_LEAD_DAYS,
                isEnabled: true,
                isFocusWeekShown: true,
                isFocusDayShown: true,
                isRhythmShown: false,
                isRitualsShown: true,
                isSleepShown: false,
                isPartnerShown: false,
                lastFetchedAt: null,
            });
            feed.tokenHash = sha256(tokenFor(feed));
            this.em.persist(feed);
        }
        feed.isEnabled = true;
        await this.em.flush();
        return this.toDto(feed);
    }

    async update(patch: Omit<CourseFeedUpdateInput, 'householdId'>): Promise<CourseFeedSettings> {
        const feed = await this.mineOrFail();
        const keys = [
            'isFocusWeekShown',
            'isFocusDayShown',
            'isRhythmShown',
            'isRitualsShown',
            'isSleepShown',
            'isPartnerShown',
        ] as const;
        for (const key of keys) {
            const value = patch[key];
            if (value !== undefined) feed[key] = value;
        }
        if (patch.monthCloseLeadDays !== undefined)
            feed.monthCloseLeadDays = patch.monthCloseLeadDays;
        await this.em.flush();
        this.cache.delete(feed.tokenHash);
        return this.toDto(feed);
    }

    /** New address; the old one stops working at once. */
    async rotate(): Promise<CourseFeedSettings> {
        const feed = await this.mineOrFail();
        this.cache.delete(feed.tokenHash);
        feed.version += 1;
        feed.tokenHash = sha256(tokenFor(feed));
        await this.em.flush();
        return this.toDto(feed);
    }

    // ====================================================================
    // ? DELETE Operations
    // ====================================================================

    async disable(): Promise<CourseFeedSettings> {
        const feed = await this.mine();
        if (!feed) return defaultSettings();
        feed.isEnabled = false;
        this.cache.delete(feed.tokenHash);
        await this.em.flush();
        return this.toDto(feed);
    }

    // ====================================================================
    // Private
    // ====================================================================

    private async mine(): Promise<GrowthCourseFeed | null> {
        const accountId = await this.visibility.requireViewerAccountId();
        return this.feeds.findOne({ account: accountId });
    }

    private async mineOrFail(): Promise<GrowthCourseFeed> {
        const feed = await this.mine();
        if (!feed) throw apiNotFound('course_feed_not_found');
        return feed;
    }

    private toDto(feed: GrowthCourseFeed): CourseFeedSettings {
        const url = feed.isEnabled ? feedUrlFor(tokenFor(feed)) : null;
        return {
            isEnabled: feed.isEnabled,
            url,
            webcalUrl: url ? url.replace(/^https?:\/\//, 'webcal://') : null,
            isFocusWeekShown: feed.isFocusWeekShown,
            isFocusDayShown: feed.isFocusDayShown,
            isRhythmShown: feed.isRhythmShown,
            isRitualsShown: feed.isRitualsShown,
            isSleepShown: feed.isSleepShown,
            isPartnerShown: feed.isPartnerShown,
            monthCloseLeadDays: feed.monthCloseLeadDays as CourseFeedSettings['monthCloseLeadDays'],
            lastFetchedAt: feed.lastFetchedAt?.toISOString() ?? null,
        };
    }
}

/** Which rows a person's feed carries, from their switches. */
export function isShown(
    entry: CourseScheduleEntry,
    feed: Pick<
        GrowthCourseFeed,
        | 'isFocusWeekShown'
        | 'isFocusDayShown'
        | 'isRhythmShown'
        | 'isRitualsShown'
        | 'isSleepShown'
        | 'isPartnerShown'
    >
): boolean {
    if (!entry.isMine && !feed.isPartnerShown) return false;
    switch (entry.kind) {
        case CourseScheduleKind.FOCUS_WEEK:
            return feed.isFocusWeekShown;
        case CourseScheduleKind.FOCUS_DAY:
            return feed.isFocusDayShown;
        case CourseScheduleKind.RHYTHM:
            return feed.isRhythmShown;
        case CourseScheduleKind.SLEEP:
            return feed.isSleepShown;
        default:
            return entry.lane === CourseLane.CHECK && feed.isRitualsShown;
    }
}

function defaultSettings(): CourseFeedSettings {
    return {
        isEnabled: false,
        url: null,
        webcalUrl: null,
        isFocusWeekShown: true,
        isFocusDayShown: true,
        isRhythmShown: false,
        isRitualsShown: true,
        isSleepShown: false,
        isPartnerShown: false,
        monthCloseLeadDays: MONTH_CLOSE_DEFAULT_LEAD_DAYS,
        lastFetchedAt: null,
    };
}

function tokenFor(feed: Pick<GrowthCourseFeed, 'id' | 'version'>): string {
    return createHmac('sha256', loadEnv().BETTER_AUTH_SECRET)
        .update(`course-feed:${feed.id}:${feed.version}`)
        .digest('base64url');
}

function feedUrlFor(token: string): string {
    const env = loadEnv();
    const origin = (env.DOMAIN_BACK_PUBLIC ?? env.DOMAIN_BACK).replace(/\/$/, '');
    return `${origin}/calendar/${token}.ics`;
}

function sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
}

function safeEqual(left: string, right: string): boolean {
    const leftBytes = Buffer.from(left);
    const rightBytes = Buffer.from(right);
    return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}
