// src/common/guards/workspace.guard.ts

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Logger } from 'nestjs-pino';

import { UsersService } from '../../users/users.service';
import { WorkspacesService } from '../../workspaces/workspaces.service';
import { SubscriptionPlan } from '../enums/subscription-plan.enum';

@Injectable()
export class WorkspaceGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly usersService: UsersService,
    private readonly workspacesService: WorkspacesService,
    private readonly logger: Logger,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user || !user.id) {
      this.logger.warn('WorkspaceGuard: No user found on request');
      throw new UnauthorizedException('User authentication required');
    }

    // Extract workspaceId (param/body/query)
    const workspaceId =
      request.params?.workspaceId || request.body?.workspaceId || request.query?.workspaceId;

    if (!workspaceId) {
      this.logger.warn('WorkspaceGuard: No workspaceId provided');
      throw new ForbiddenException('Workspace ID required');
    }

    // --- Membership check ---
    const membership = await this.workspacesService.getUserWorkspaceMembership(
      user.id,
      workspaceId,
    );
    if (!membership || membership.status !== 'active') {
      this.logger.warn('WorkspaceGuard: User not a member or inactive: %o', {
        userId: user.id,
        workspaceId,
      });
      throw new ForbiddenException('You are not an active member of this workspace');
    }

    // --- Workspace & subscription check ---
    const workspace = await this.workspacesService.findByIdWithSubscription(workspaceId);
    if (!workspace) {
      this.logger.warn('WorkspaceGuard: Workspace not found: %o', { workspaceId });
      throw new ForbiddenException('Workspace not found');
    }
    // Find the first active subscription
    const activeSub = Array.isArray(workspace.subscriptions)
      ? workspace.subscriptions.find((s: any) => s.status === 'active')
      : undefined;
    if (!activeSub) {
      this.logger.warn('WorkspaceGuard: Workspace subscription inactive: %o', { workspaceId });
      throw new ForbiddenException('Workspace does not have an active subscription');
    }

    // Attach to request: full workspace (with subscription), membership, plan
    request.workspace = workspace;
    request.workspaceMembership = {
      ...(membership as any),
      role: (membership as any).role,
    };
    request.workspaceSubscriptionPlan = activeSub.plan as SubscriptionPlan;
    request.subscription = activeSub;
    if (request.user) {
      request.user.isGuest = false;
      request.user.workspaceMembership = membership;
    }

    return true;
  }
}
