// src/common/decorators/guest-allowed.decorator.ts
import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiUnauthorizedResponse, ApiForbiddenResponse } from '@nestjs/swagger';

import { GuestOrWorkspaceMemberGuard } from '../guards/guest-or-workspace-member.guard';

export function GuestOrWorkspaceMember() {
  return applyDecorators(
    UseGuards(GuestOrWorkspaceMemberGuard),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Unauthorized: valid user or guest token required.' }),
    ApiForbiddenResponse({ description: 'Forbidden: insufficient permissions.' }),
  );
}
