// src/app.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';

import configuration from './config/configuration';
import { validationSchema } from './config/validation';
import { UsersModule } from './users/users.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { UserWorkspacesModule } from './user-workspaces/user-workspaces.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { GuestTokensModule } from './guest-tokens/guest-tokens.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuditEventsModule } from './audit-events/audit-events.module';
import { FilesModule } from './files/files.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { PrismaModule } from './prisma/prisma.module';
import { GuestOrMemberPocModule } from './guest-or-member-poc/guest-or-member-poc.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
    }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          level: config.get<string>('logging.level') || 'info',
          // Deterministic transport based on NODE_ENV at container start.
          transport:
            config.get<string>('nodeEnv') === 'production'
              ? {
                  targets: [
                    {
                      target: 'pino-logflare',
                      options: {
                        apiKey: config.get<string>('logging.betterStackToken'),
                      },
                    },
                    {
                      target: 'pino-pretty',
                      options: { colorize: true },
                    },
                  ],
                }
              : {
                  target: 'pino-pretty',
                  options: { colorize: true },
                },
        },
      }),
    }),
    PrismaModule,
    UsersModule,
    WorkspacesModule,
    UserWorkspacesModule,
    SubscriptionsModule,
    GuestTokensModule,
    NotificationsModule,
    AuditEventsModule,
    FilesModule,
    AuthModule,
    HealthModule,
    GuestOrMemberPocModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
