import { Controller, Get, Param, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Request } from 'express';

import { GuestOrWorkspaceMember } from '../common/decorators/guest-or-workspace-member.decorator';
import { GuestOrMemberPocService } from './guest-or-member-poc.service';

@ApiTags('GuestOrMemberPOC')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId/trial-feature')
export class GuestOrMemberPocController {
  constructor(private readonly service: GuestOrMemberPocService) {}

  @Get()
  @GuestOrWorkspaceMember()
  @ApiOperation({ summary: 'Get access info for guest or member' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Access info for guest or user' })
  async getAccessInfo(@Param('workspaceId') workspaceId: string, @Req() req: Request) {
    return this.service.getAccessInfo(req, workspaceId);
  }
}
