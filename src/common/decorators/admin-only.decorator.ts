// src/common/decorators/admin-only.decorator.ts
import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';

import { ClerkAuthGuard } from '../guards/clerk-auth.guard';
import { AdminGuard } from '../guards/admin.guard';

export const ADMIN_ONLY_KEY = 'isAdminOnly';

export function AdminOnly() {
  return applyDecorators(
    SetMetadata(ADMIN_ONLY_KEY, true),
    UseGuards(ClerkAuthGuard, AdminGuard),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Unauthorized: valid token required.' }),
    ApiForbiddenResponse({ description: 'Forbidden: admin access required.' }),
  );
}
