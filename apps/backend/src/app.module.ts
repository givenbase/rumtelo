import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module, type DynamicModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ORPCModule } from '@orpc/nest';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';

import type { Env } from './common/config/env.config';

import ormConfig from '../mikro-orm.config';
import { OrpcErrorFilter } from './common/filters/orpc-error.filter';
import { HouseholdContextModule } from './common/household/household-context.module';
import { CapabilityAccessModule } from './common/capability';
import { MarkErrorsDefinedPlugin } from './common/plugins/mark-errors-defined.plugin';
import { RedisModule, createThrottlerOptions } from './common/redis';
import { mapDatabaseConstraintErrorInterceptor } from './common/utils/database-constraint-error.util';
import { createAuth } from './modules/auth/engine/auth.config';
import { FeatureModules } from './modules/index';
import { PagesModule } from './pages/pages.module';

@Module({})
export class AppModule {
    static forRoot(env: Env): DynamicModule {
        return {
            module: AppModule,
            imports: [
                ConfigModule.forRoot({ isGlobal: true, cache: true }),
                MikroOrmModule.forRoot(ormConfig),
                RedisModule,
                ScheduleModule.forRoot(),
                ThrottlerModule.forRoot(createThrottlerOptions()),
                BetterAuthModule.forRoot({ auth: createAuth(env) }),
                ORPCModule.forRoot({
                    interceptors: [mapDatabaseConstraintErrorInterceptor],
                    plugins: [new MarkErrorsDefinedPlugin() as never],
                }),
                HouseholdContextModule,
                CapabilityAccessModule,
                PagesModule,
                ...FeatureModules,
            ],
            providers: [
                { provide: APP_GUARD, useClass: ThrottlerGuard },
                { provide: APP_FILTER, useClass: OrpcErrorFilter },
            ],
        };
    }
}
