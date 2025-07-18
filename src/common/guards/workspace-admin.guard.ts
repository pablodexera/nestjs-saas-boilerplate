// src/common/guards/workspace-admin.guard.ts

import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { Request } from 'express';

import { WorkspaceGuard } from './workspace.guard';

@Injectable()
export class WorkspaceAdminGuard implements CanActivate {
  constructor(
    private readonly workspaceGuard: WorkspaceGuard,
    private readonly logger: PinoLogger,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Run the WorkspaceGuard first to validate membership and attach data
    await this.workspaceGuard.canActivate(context);

    const req: Request = context.switchToHttp().getRequest();
    const role = (req.workspaceMembership as any)?.role;

    // Check for active subscription (mirroring WorkspaceGuard logic)
    const workspace = req.workspace as { subscriptions?: any[]; id?: string };
    const activeSub = Array.isArray(workspace?.subscriptions)
      ? workspace.subscriptions.find((s: any) => s.status === 'active')
      : undefined;
    if (!activeSub) {
      this.logger.warn('WorkspaceAdminGuard: Workspace has no active subscription: %o', {
        workspaceId: workspace?.id,
        path: req.url,
      });
      throw new ForbiddenException('Workspace does not have an active subscription');
    }

    if (workspace && activeSub) {
      req.subscription = activeSub;
      if (req.user) {
        req.user.isGuest = false;
      }
    }

    if (role === 'OWNER' || role === 'ADMIN') {
      return true;
    }

    this.logger.warn('WorkspaceAdminGuard: Forbidden access attempt: %o', {
      userId: req.user?.id,
      path: req.url,
    });

    throw new ForbiddenException('Workspace admin or owner role required');
  }
}
