// src/common/decorators/workspace-member.decorator.ts
import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';

import { ClerkAuthGuard } from '../guards/clerk-auth.guard';
import { WorkspaceGuard } from '../guards/workspace.guard';

export const WORKSPACE_MEMBER_KEY = 'isWorkspaceMember';

export function WorkspaceMember() {
  return applyDecorators(
    SetMetadata(WORKSPACE_MEMBER_KEY, true),
    UseGuards(ClerkAuthGuard, WorkspaceGuard),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Unauthorized: valid token required.' }),
    ApiForbiddenResponse({ description: 'Forbidden: workspace membership required.' }),
  );
}
