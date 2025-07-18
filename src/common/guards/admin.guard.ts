// src/common/guards/admin.guard.ts
import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { Request } from 'express';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly logger: PinoLogger) {}

  canActivate(context: ExecutionContext): boolean {
    const req: Request = context.switchToHttp().getRequest();

    if ((req.user as any)?.is_global_admin === true) {
      if (req.user) {
        req.user.isGuest = false;
      }
      return true;
    }

    this.logger.warn('AdminGuard: Forbidden access attempt: %o', {
      userId: req.user?.id,
      path: req.url,
    });

    throw new ForbiddenException('Admin privileges required');
  }
}
