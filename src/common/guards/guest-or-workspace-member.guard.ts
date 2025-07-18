import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { PinoLogger } from 'nestjs-pino';
import { verifyToken } from '@clerk/backend';
import { randomUUID } from 'crypto';

import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionPlan } from '../enums/subscription-plan.enum';

@Injectable()
export class GuestOrWorkspaceMemberGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
    @Inject(PinoLogger) private readonly logger: PinoLogger,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'] || '';
    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) {
      this.logger.warn('Missing authorization token: %o', {
        path: request.path,
        headers: request.headers,
      });
      throw new UnauthorizedException('Missing authorization token');
    }

    let isGuest = false;
    let workspaceId: string | null = null;
    let userId: string | null = null;
    let userPayload: any = null;

    // 1. Extract workspaceId from request (required for all guest-or-workspace-member endpoints)
    workspaceId =
      request.params.workspaceId ||
      request.body.workspaceId ||
      request.query.workspaceId ||
      request.headers['x-workspace-id'];
    if (!workspaceId) {
      this.logger.warn('Workspace context required for all calls: %o', {
        route: request.path,
      });
      throw new ForbiddenException('Workspace context required');
    }

    // 1. Attempt guest token verification (stateless JWT)
    let guestTokenWorkspaceId: string | undefined;
    try {
      const guestPayload = this.jwtService.verify(token, {
        secret: process.env.GUEST_TOKEN_SECRET,
        ignoreExpiration: false,
      });
      if (guestPayload?.guest) {
        isGuest = true;
        guestTokenWorkspaceId = guestPayload.workspaceId;
      }
    } catch (e) {
      const err = e as Error;
      this.logger.debug('Guest token validation failed: %o', {
        error: err.message,
        route: request.path,
      });
      // Continue to user JWT path if guest token fails
    }

    // 2. For guests, harmonize workspaceId from request and token
    if (isGuest) {
      // If workspaceId is missing in request, use the one from the token
      if (!workspaceId && guestTokenWorkspaceId) {
        workspaceId = guestTokenWorkspaceId;
      }
      // If both exist, they must match
      if (workspaceId && guestTokenWorkspaceId && workspaceId !== guestTokenWorkspaceId) {
        this.logger.warn('Guest workspaceId mismatch: %o', {
          workspaceIdFromRequest: workspaceId,
          workspaceIdFromToken: guestTokenWorkspaceId,
          route: request.path,
        });
        throw new ForbiddenException('Workspace ID mismatch for guest');
      }
      // Now, workspaceId must match GUEST_WORKSPACE_ID
      const guestWorkspaceId = process.env.GUEST_WORKSPACE_ID || 'guest-demo-workspace-id';
      if (workspaceId !== guestWorkspaceId) {
        this.logger.warn('Guest attempted to access non-guest workspace: %o', {
          workspaceId,
          guestWorkspaceId,
          route: request.path,
        });
        throw new ForbiddenException('Guests may only access the guest workspace');
      }
      // Build request.user for guest
      request.user = {
        isGuest: true,
        id: randomUUID(),
      };
      this.logger.info(
        {
          workspaceId,
          route: request.path,
          headers: request.headers,
        },
        'Authenticated as guest via guest token',
      );
    }

    // 3. If not guest, validate as Clerk user JWT (RS256, Clerk JWKS)
    if (!isGuest) {
      try {
        const { payload } = await verifyToken(token, {
          secretKey: process.env.CLERK_SECRET_KEY || '',
        });
        userPayload = payload as any;

        userId = userPayload.sub || userPayload.id;
        if (!userId) throw new Error('User token missing sub/id');
        request.user = {
          isGuest: false,
          id: userId,
          email: userPayload.email,
          ...userPayload,
        };
        this.logger.info(
          { userId, workspaceId, route: request.path },
          'Authenticated as user via Clerk JWT',
        );
      } catch (e) {
        const err = e as Error;
        this.logger.warn('Failed Clerk JWT verification (user or guest): %o', {
          error: err.message,
          route: request.path,
          headers: request.headers,
        });
        throw new UnauthorizedException('Invalid or expired user/guest token');
      }
    }

    // 4. Lookup workspace, ensure it exists, and attach subscription
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId! },
      include: { subscriptions: true },
    });
    if (!workspace) {
      this.logger.warn('Workspace not found: %o', { workspaceId, route: request.path });
      throw new ForbiddenException('Workspace not found');
    }
    // Find the first active subscription
    const activeSub = Array.isArray(workspace.subscriptions)
      ? workspace.subscriptions.find((s: any) => s.status === 'active')
      : undefined;
    if (!activeSub) {
      this.logger.warn('Workspace has no active subscription: %o', {
        workspaceId,
        route: request.path,
      });
      throw new ForbiddenException('Workspace does not have an active subscription');
    }
    if (
      ![
        SubscriptionPlan.FREE,
        SubscriptionPlan.PLUS,
        SubscriptionPlan.PRO,
        SubscriptionPlan.ENTERPRISE,
      ].includes(activeSub.plan as SubscriptionPlan)
    ) {
      this.logger.warn(
        {
          workspaceId,
          subStatus: activeSub.status,
          subPlan: activeSub.plan,
          route: request.path,
        },
        'Workspace subscription not allowed',
      );
      throw new ForbiddenException('Workspace subscription is not allowed');
    }

    // 5. If user (not guest), check active membership in workspace
    if (!isGuest) {
      const membership = await this.prisma.userWorkspace.findUnique({
        where: {
          user_id_workspace_id: {
            user_id: userId!,
            workspace_id: workspaceId!,
          },
        },
      });
      if (!membership || membership.status !== 'active') {
        this.logger.warn('Access denied: %o', { userId, workspaceId, route: request.path });
        throw new ForbiddenException('User is not an active member of this workspace');
      }
      if (request.user) {
        request.user.workspaceMembership = membership;
      }
    }

    // 6. Attach workspace and its subscription for downstream use
    request.workspace = workspace;
    request.subscription = activeSub;

    this.logger.info('Access granted: guest/user, workspace, and subscription validated: %o', {
      user: request.user,
      workspaceId,
      plan: activeSub.plan,
      guest: isGuest,
      route: request.path,
    });

    return true;
  }
}
