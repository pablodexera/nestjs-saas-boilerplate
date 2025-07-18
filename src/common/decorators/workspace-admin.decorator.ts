// src/common/decorators/workspace-admin.decorator.ts

import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';

import { ClerkAuthGuard } from '../guards/clerk-auth.guard';
import { WorkspaceAdminGuard } from '../guards/workspace-admin.guard';

export const WORKSPACE_ADMIN_KEY = 'isWorkspaceAdmin';

export function WorkspaceAdmin() {
  return applyDecorators(
    SetMetadata(WORKSPACE_ADMIN_KEY, true),
    UseGuards(ClerkAuthGuard, WorkspaceAdminGuard),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Unauthorized: valid token required.' }),
    ApiForbiddenResponse({ description: 'Forbidden: workspace admin access required.' }),
  );
}
