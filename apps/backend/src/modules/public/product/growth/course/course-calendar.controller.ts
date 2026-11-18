import type { FastifyReply } from 'fastify';

import { Controller, Get, Inject, NotFoundException, Param, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';

import { CourseFeedService } from './course-feed.service';

/**
 * Public ICS address: `GET /calendar/:token.ics`. No session — the secret token is
 * the key. Unknown, rotated or switched-off addresses answer 404 without saying which.
 * Household scope is set inside the service, as the feed's own person.
 */
@AllowAnonymous()
@Controller('calendar')
export class CourseCalendarController {
    constructor(@Inject(CourseFeedService) private readonly feeds: CourseFeedService) {}

    @Get(':file')
    // Calendars poll hourly; this leaves room for retries without inviting guessing.
    @Throttle({ default: { limit: 60, ttl: 600_000 } })
    async feed(@Param('file') file: string, @Res() reply: FastifyReply): Promise<void> {
        const token = file.endsWith('.ics') ? file.slice(0, -4) : file;
        const body = await this.feeds.renderByToken(token);
        if (!body) throw new NotFoundException();
        await reply
            .header('content-type', 'text/calendar; charset=utf-8')
            .header('cache-control', 'private, max-age=300')
            .header('x-robots-tag', 'noindex')
            .send(body);
    }
}
