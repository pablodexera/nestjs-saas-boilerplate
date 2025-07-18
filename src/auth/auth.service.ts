// src/auth/auth.service.ts

import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

import { UsersService } from '../users/users.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { AuditEventUtil } from '../audit-events/audit-event.util';
import { ClerkUserDto } from './dto/clerk-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly workspacesService: WorkspacesService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly auditEventUtil: AuditEventUtil,
    private readonly logger: PinoLogger,
  ) {}

  // Clerk webhook: user.created
  async handleClerkUserCreated(data: ClerkUserDto) {
    try {
      const userId = data.id;
      const email = data.email_addresses?.[0]?.email_address ?? '';
      const fullName = [data.first_name, data.last_name].filter(Boolean).join(' ').trim();
      const avatarUrl = data.image_url ?? '';

      const socialProvider: string | undefined =
        (data.public_metadata as any)?.social_provider ||
        (data.private_metadata as any)?.social_provider ||
        undefined;

      const country: string | undefined =
        (data.public_metadata as any)?.country ||
        (data.private_metadata as any)?.country ||
        undefined;

      const createdAt: Date = data.created_at ? new Date(data.created_at * 1000) : new Date();

      const userDto = {
        id: userId,
        email,
        full_name: fullName,
        avatar_url: avatarUrl,
        is_global_admin: false,
        primary_workspace_id: undefined,
        created_at: createdAt,
        updated_at: createdAt,
        last_login_at: null,
        social_provider: socialProvider ?? undefined,
        country: country ?? undefined,
        is_disabled: false,
      };

      // Upsert user in DB
      const user = await this.usersService.upsertFromClerk(userDto);

      // Create default workspace (with automatic subscription and membership)
      const workspace = await this.workspacesService.create(
        {
          name: fullName ? `${fullName}'s Workspace` : 'My Workspace',
          slug: fullName ? `${fullName}-workspace` : 'my-workspace',
          owner_id: user.id,
          settings_json: {},
        },
        user.id,
      );

      // Set user's primary workspace if not already set
      if (!(user as any).primary_workspace_id) {
        await this.usersService.setPrimaryWorkspace(user.id, workspace.id);
      }

      // Audit event
      await this.auditEventUtil.logEvent({
        eventType: 'user.created',
        actorId: user.id,
        workspaceId: workspace.id,
        details: { email, socialProvider, country },
      });

      this.logger.info('Clerk user created: %o', {
        clerkUserId: userId,
        workspaceId: workspace.id,
        email,
        socialProvider,
        country,
      });

      return user;
    } catch (error) {
      const err = error as Error;
      this.logger.error('Clerk user creation webhook failed: %o', {
        error: err.message,
        stack: err.stack,
        data,
      });
      throw err;
    }
  }

  // Clerk webhook: user.logged_in
  async handleClerkUserLoggedIn(data: ClerkUserDto) {
    try {
      const userId = data.id;
      const email = data.email_addresses?.[0]?.email_address ?? '';
      const lastLoginAt: Date = data.last_sign_in_at
        ? new Date(data.last_sign_in_at * 1000)
        : new Date();

      const user = await this.usersService.updateLastLogin(userId, lastLoginAt);

      await this.auditEventUtil.logEvent({
        eventType: 'user.logged_in',
        actorId: userId,
        details: { email },
      });

      this.logger.info('Clerk user logged in and last_login_at updated', {
        clerkUserId: userId,
        email,
        lastLoginAt: lastLoginAt.toISOString(),
      });

      return user;
    } catch (error) {
      const err = error as Error;
      this.logger.error('Clerk user login webhook failed: %o', {
        error: err.message,
        stack: err.stack,
        data,
      });
      throw err;
    }
  }
}
