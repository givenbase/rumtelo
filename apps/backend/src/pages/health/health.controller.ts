import { EntityManager } from '@mikro-orm/postgresql';
import {
    Inject,
    Controller,
    Get,
    Headers,
    HttpCode,
    HttpStatus,
    Res,
    ServiceUnavailableException,
} from '@nestjs/common';
import { ApiExcludeController, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { type FastifyReply } from 'fastify';

import { RedisService } from '../../common/redis';
import { loadEnv } from '../../common/config/env.config';
import { renderBrandPage } from '../shared/brand-shell';

type ProbeStatus = 'connected' | 'disconnected' | 'error' | 'disabled';

/**
 * Health checks for Railway / load balancers — no auth, no throttle.
 * Browsers get a branded HTML page; probes (`Accept: application/json` / curl) get JSON.
 */
@ApiTags('Health')
@ApiExcludeController()
@SkipThrottle()
@AllowAnonymous()
@Controller()
export class HealthController {
    constructor(
        @Inject(EntityManager) private readonly em: EntityManager,
        // Value import (not `import type`) — Nest needs the class at runtime for DI.
        @Inject(RedisService) private readonly redis: RedisService
    ) {}

    @Get('health')
    @ApiOperation({ summary: 'Liveness + DB / Redis probe' })
    async getHealth(
        @Headers('accept') accept: string | undefined,
        @Res() reply: FastifyReply
    ): Promise<void> {
        const [{ database, detail }, redis] = await Promise.all([
            this.probeDatabase(),
            this.probeRedis(),
        ]);

        const ok = database === 'connected';
        const maintenance = loadEnv().MAINTENANCE;
        const body = {
            status: ok ? 'ok' : 'degraded',
            maintenance,
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV ?? 'development',
            database,
            redis,
            ...(detail ? { detail } : {}),
        };

        if (wantsHtml(accept)) {
            const isProd = (process.env.NODE_ENV ?? 'development') === 'production';
            void reply.type('text/html').send(
                renderBrandPage({
                    title: 'Health',
                    eyebrow: body.status,
                    headline: body.status === 'ok' ? 'Alles draait' : 'Degraded',
                    message: isProd
                        ? body.status === 'ok'
                            ? 'API is online and ready.'
                            : 'API is up but a dependency check failed.'
                        : body.status === 'ok'
                          ? `API en database OK · Redis: ${redis}`
                          : `Database: ${database}${detail ? ` — ${detail}` : ''} · Redis: ${redis}`,
                    code: body.status.toUpperCase(),
                    primaryHref: '/',
                    primaryLabel: 'API home',
                    secondaryHref: '/health/live',
                    secondaryLabel: 'Liveness JSON',
                    footerHtml: isProd
                        ? `uptime ${Math.floor(body.uptime)}s`
                        : `uptime ${Math.floor(body.uptime)}s · ${body.environment}`,
                    lang: isProd ? 'en' : 'nl',
                })
            );
            return;
        }

        void reply.type('application/json').send(body);
    }

    @Get('health/ready')
    @ApiOperation({ summary: 'Readiness — DB must be connected' })
    async getReady() {
        const { database, detail } = await this.probeDatabase();
        if (database !== 'connected') {
            throw new ServiceUnavailableException({
                status: 'not ready',
                timestamp: new Date().toISOString(),
                database,
                ...(detail ? { detail } : {}),
            });
        }
        return {
            status: 'ready',
            timestamp: new Date().toISOString(),
            database: 'connected',
            redis: await this.probeRedis(),
        };
    }

    @Get('health/live')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Liveness — process is up' })
    getLive() {
        return {
            status: 'alive',
            timestamp: new Date().toISOString(),
        };
    }

    /** Real round-trip — more reliable than `isConnected()` alone. */
    private async probeDatabase(): Promise<{ database: ProbeStatus; detail?: string }> {
        try {
            await this.em.getConnection().execute('select 1 as ok');
            return { database: 'connected' };
        } catch (error) {
            const detail = error instanceof Error ? error.message : 'Unknown error';
            return { database: 'error', detail };
        }
    }

    private async probeRedis(): Promise<ProbeStatus> {
        if (!this.redis?.client) return 'disabled';
        if (await this.redis.ping()) return 'connected';
        return this.redis.isAvailable ? 'error' : 'disconnected';
    }
}

function wantsHtml(accept: string | undefined): boolean {
    if (!accept) return false;
    const html = accept.includes('text/html');
    const json = accept.includes('application/json');
    return html && !json;
}
