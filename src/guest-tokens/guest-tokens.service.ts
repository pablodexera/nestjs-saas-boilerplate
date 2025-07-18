import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { GuestTokenEntity } from './guest-tokens.entity';

const GUEST_TOKEN_SECRET = process.env.GUEST_TOKEN_SECRET || 'change-me-in-prod';
const GUEST_TOKEN_EXPIRY_SECONDS = parseInt(process.env.GUEST_TOKEN_EXPIRY_SECONDS || '3600', 10);
const GUEST_WORKSPACE_ID = process.env.GUEST_WORKSPACE_ID || 'guest-demo-workspace-id';

@Injectable()
export class GuestTokensService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {}

  private generateOpaqueToken(): string {
    return crypto.randomBytes(36).toString('base64url');
  }

  private generateGuestJWT(
    payload: { guest: true; workspaceId: string },
    expiresInSeconds: number,
  ): string {
    return jwt.sign({ ...payload, jti: randomUUID() }, GUEST_TOKEN_SECRET, {
      expiresIn: expiresInSeconds,
    });
  }

  async issueToken(): Promise<string> {
    // Always provision for the backend-configured guest workspace
    const workspaceId = GUEST_WORKSPACE_ID;
    const token = this.generateGuestJWT({ guest: true, workspaceId }, GUEST_TOKEN_EXPIRY_SECONDS);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + GUEST_TOKEN_EXPIRY_SECONDS * 1000);

    await this.prisma.guestToken.create({
      data: {
        token,
        workspace_id: workspaceId,
        issued_at: now,
        expires_at: expiresAt,
        permissions: { guest: true },
        usage_count: 0,
        max_usage: null,
      },
    });

    this.logger.info('Guest token issued', {
      workspaceId,
      token,
      expiresAt,
      jwtMode: true,
    });
    return token;
  }
  async validateToken(token: string, action?: string): Promise<GuestTokenEntity> {
    const guestToken = await this.prisma.guestToken.findUnique({ where: { token } });
    if (!guestToken) {
      this.logger.warn('Validate failed - token not found: %o', { token });
      throw new NotFoundException('Guest token not found');
    }
    const now = new Date();
    if (guestToken.expires_at < now) {
      this.logger.warn('Validate failed - token expired: %o', { token });
      throw new ForbiddenException('Guest token expired');
    }
    if (guestToken.max_usage && guestToken.usage_count >= guestToken.max_usage) {
      this.logger.warn('Validate failed - token usage exceeded: %o', { token });
      throw new ForbiddenException('Guest token usage exceeded');
    }
    if (
      action &&
      guestToken.permissions &&
      typeof guestToken.permissions === 'object' &&
      guestToken.permissions !== null
    ) {
      const permissions = guestToken.permissions as Record<string, any>;
      if (!permissions[action]) {
        this.logger.warn('Validate failed - action not allowed: %o', {
          token,
          action,
        });
        throw new ForbiddenException('Guest token does not allow this action');
      }
    }
    this.logger.info('Guest token validated', { token, action });
    return guestToken;
  }

  async incrementUsage(token: string): Promise<GuestTokenEntity> {
    const guestToken = await this.prisma.guestToken.findUnique({ where: { token } });
    if (!guestToken) {
      this.logger.warn('Increment usage failed - token not found: %o', { token });
      throw new NotFoundException('Guest token not found');
    }
    const updated = await this.prisma.guestToken.update({
      where: { token },
      data: { usage_count: { increment: 1 } },
    });
    this.logger.info('Guest token usage incremented', {
      token,
      newUsageCount: updated.usage_count,
    });
    return updated;
  }

  async revokeToken(token: string): Promise<void> {
    const guestToken = await this.prisma.guestToken.findUnique({ where: { token } });
    if (!guestToken) {
      this.logger.warn('Revoke token failed - token not found: %o', { token });
      throw new NotFoundException('Guest token not found');
    }
    await this.prisma.guestToken.delete({ where: { token } });
    this.logger.info('Guest token revoked', { token });
  }

  async refreshToken(oldToken: string, workspaceId: string): Promise<string> {
    const existing = await this.validateToken(oldToken);

    await this.prisma.guestToken.delete({ where: { token: oldToken } });

    // Validate that the workspaceId matches the token's workspace_id
    if (existing.workspace_id !== workspaceId) {
      throw new ForbiddenException('Workspace ID mismatch for guest token refresh');
    }

    // Always use the current time for iat/exp to ensure a new token
    const token = this.generateGuestJWT({ guest: true, workspaceId }, GUEST_TOKEN_EXPIRY_SECONDS);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + GUEST_TOKEN_EXPIRY_SECONDS * 1000);

    await this.prisma.guestToken.create({
      data: {
        token,
        workspace_id: workspaceId,
        issued_at: now,
        expires_at: expiresAt,
        permissions: existing.permissions || { guest: true },
        usage_count: 0,
        max_usage: existing.max_usage ?? null,
      },
    });

    this.logger.info('Guest token refreshed', {
      oldToken,
      newToken: token,
      workspaceId,
      jwtMode: true,
    });

    return token;
  }

  async getActiveTokensForWorkspace(workspaceId: string): Promise<GuestTokenEntity[]> {
    const now = new Date();
    const tokens = await this.prisma.guestToken.findMany({
      where: { workspace_id: workspaceId, expires_at: { gt: now } },
    });
    this.logger.info('Active guest tokens fetched for workspace', {
      workspaceId,
      count: tokens.length,
    });
    return tokens;
  }
}
