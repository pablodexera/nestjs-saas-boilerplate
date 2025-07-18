// src/auth/auth.module.ts

import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ClerkStrategy } from './strategies/clerk.strategy';
import { AuditEventsModule } from '../audit-events/audit-events.module';
import { UsersModule } from '../users/users.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [
    JwtModule.register({
      // ... your JWT config
    }),
    UsersModule,
    WorkspacesModule,
    SubscriptionsModule,
    AuditEventsModule,
    PassportModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, ClerkStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
