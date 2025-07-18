import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

/**
 * Guard that enforces the request user is a valid authenticated Clerk user.
 * Rejects guests and missing users.
 */
@Injectable()
export class CurrentUserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req: Request = context.switchToHttp().getRequest();
    const user = req.user as any;
    if (!user || user.isGuest) {
      throw new UnauthorizedException('User authentication required');
    }
    user.isGuest = false;
    return true;
  }
}
