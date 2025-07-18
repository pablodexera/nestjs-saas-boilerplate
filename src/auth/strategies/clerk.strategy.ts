// src/auth/strategies/clerk.strategy.ts

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { Request } from 'express';
import { verifyToken } from '@clerk/backend';
import { PinoLogger } from 'nestjs-pino';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ClerkStrategy extends PassportStrategy(Strategy, 'clerk') {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {
    super();
  }

  async validate(req: Request): Promise<any> {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim();

    if (!token) {
      this.logger.error('Missing authorization token');
      throw new UnauthorizedException('Missing authorization token');
    }

    try {
      const result = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY || '',
      });

      const payload = result.payload || result;

      if (!payload || !(payload as any).sub) {
        this.logger.error('Invalid payload or missing sub claim');
        throw new UnauthorizedException('Invalid Clerk JWT');
      }

      this.logger.info('ClerkStrategy: Raw payload from Clerk %o', payload);

      const user = {
        id: (payload as any).sub || (payload as any).id,
        email: (payload as any).email,
        provider: (payload as any).provider || 'clerk',
        isClerk: true,
        ...(payload as any),
      };

      this.logger.info('ClerkStrategy: About to enrich user from DB %o', {
        userId: user.id,
        email: user.email,
      });
      const dbUser = await this.prisma.user.findUnique({ where: { id: user.id } });
      this.logger.info('ClerkStrategy: DB user lookup resultx %o', dbUser);
      this.logger.info('ClerkStrategy: DB user is_global_admin %o', {
        is_global_admin: dbUser?.is_global_admin,
      });
      if (dbUser) {
        user.is_global_admin = dbUser.is_global_admin;
        user.is_disabled = dbUser.is_disabled;
      }
      this.logger.info(
        'ClerkStrategy: AUTH DEBUG userId=%s email=%s is_global_admin=%s',
        user.id,
        user.email,
        user.is_global_admin,
      );
      this.logger.info('ClerkStrategy: Final user is_global_admin %o', {
        is_global_admin: user.is_global_admin,
      });
      this.logger.info('ClerkStrategy: Final user object returned %o', user);

      return user;
    } catch (error) {
      this.logger.error('Token verification failed: %o', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new UnauthorizedException('Invalid Clerk JWT');
    }
  }
}
