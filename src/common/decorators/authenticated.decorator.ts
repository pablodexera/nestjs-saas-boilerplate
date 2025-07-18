import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';

import { ClerkAuthGuard } from '../guards/clerk-auth.guard';
import { CurrentUserGuard } from '../guards/current-user.guard';

/**
 * Use on endpoints that require any authenticated platform user (admin, regular user, etc).
 * Excludes guests and unauthenticated users.
 */
export function Authenticated() {
  return applyDecorators(
    UseGuards(ClerkAuthGuard, CurrentUserGuard),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Unauthorized: valid token required.' }),
    ApiForbiddenResponse({ description: 'Forbidden: user access required.' }),
  );
}
