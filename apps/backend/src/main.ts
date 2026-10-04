import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { buildBetterAuthTrustedOrigins } from '@rumtelo/utils';

import { AppModule } from './app.module';
import { loadEnv, type Env } from './common/config/env.config';
import { loadEnvFiles } from './common/config/load-env';
import { setupOrpcErrorFix } from './common/config/setup-orpc-error-fix.config';
import { setupSwagger } from './common/config/setup-swagger.config';

import 'reflect-metadata';

/**
 * Fill gaps from a local `.env` before validation.
 * Platform-injected vars are never overwritten (see loadEnvFiles).
 */
loadEnvFiles();

function setupGlobalErrorHandlers(): void {
    const logger = new Logger('GlobalErrorHandler');

    process.on('unhandledRejection', (reason: unknown) => {
        const message = reason instanceof Error ? reason.message : String(reason);
        logger.error(`Unhandled Promise Rejection: ${message}`);
        if (reason instanceof Error && reason.stack) logger.error(reason.stack);
    });

    process.on('uncaughtException', (error: Error) => {
        logger.error(`Uncaught Exception: ${error.message}`);
        if (error.stack) logger.error(error.stack);
        process.exit(1);
    });
}

/** Create the Nest application on Fastify. Nothing here touches request handling. */
async function initializeApp(env: Env): Promise<NestFastifyApplication> {
    return NestFactory.create<NestFastifyApplication>(
        AppModule.forRoot(env),
        new FastifyAdapter({ trustProxy: true, bodyLimit: 8 * 1024 * 1024 }),
        { bufferLogs: true, rawBody: true }
    );
}

/** Register plugins, pipes and lifecycle hooks. Grows here — not in bootstrap. */
async function setupApp(app: NestFastifyApplication, env: Env): Promise<void> {
    await app.register(helmet, { contentSecurityPolicy: false });
    await app.register(cookie, { secret: env.BETTER_AUTH_SECRET });
    const trustedOrigins = buildBetterAuthTrustedOrigins([
        env.DOMAIN_APP,
        env.DOMAIN_WEB,
        env.DOMAIN_BACK_PUBLIC,
    ]);
    Logger.log(`Auth/CORS trusted origins: ${trustedOrigins.join(', ')}`, 'Bootstrap');
    await app.register(cors, {
        // Credentials + wildcard origin is not permitted; enumerate frontends (+ public Nest).
        origin: trustedOrigins,
        credentials: true,
        allowedHeaders: ['content-type', 'authorization', 'x-household-id'],
    });

    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    app.enableShutdownHooks();

    await setupOrpcErrorFix(app);
    await setupSwagger(app, env);
}

async function startApp(app: NestFastifyApplication, env: Env): Promise<void> {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    Logger.log(`Rumtelo API listening on :${env.PORT}`, 'Bootstrap');
    if (env.NODE_ENV === 'development') {
        Logger.log(`API home → http://localhost:${env.PORT}/`, 'Bootstrap');
        Logger.log(`Swagger UI → http://localhost:${env.PORT}/api/docs`, 'Bootstrap');
        Logger.log(`Email preview → http://localhost:${env.PORT}/email-preview`, 'Bootstrap');
        Logger.log(`Health → http://localhost:${env.PORT}/health`, 'Bootstrap');
    }
}

async function bootstrap() {
    setupGlobalErrorHandlers();

    const logger = new Logger('Bootstrap');
    try {
        const env = loadEnv();
        const app = await initializeApp(env);
        await setupApp(app, env);
        await startApp(app, env);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Bootstrap failed: ${message}`);
        if (error instanceof Error && error.stack) logger.error(error.stack);
        process.exit(1);
    }
}

void bootstrap();
