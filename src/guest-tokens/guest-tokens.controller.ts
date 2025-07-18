import { Controller, Post, Get, Delete, Param, Body, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';

import { GuestTokensService } from './guest-tokens.service';
import { AdminOnly } from '../common/decorators/admin-only.decorator';
import { GuestOrWorkspaceMember } from '../common/decorators/guest-or-workspace-member.decorator';
import { GuestTokenDto } from './dto/guest-token.dto';

@ApiTags('Guest Tokens')
@ApiBearerAuth()
@Controller('guest-tokens')
export class GuestTokensController {
  constructor(private readonly guestTokensService: GuestTokensService) {}

  // === PUBLIC ENDPOINT ===
  @Post('issue')
  @ApiOperation({
    summary: 'Provision a new guest token for the default guest workspace (no auth required)',
  })
  @ApiResponse({
    status: 201,
    description: 'Guest token issued',
    schema: { example: 'jwtTokenString' },
  })
  async issueGuestToken(): Promise<string> {
    return await this.guestTokensService.issueToken();
  }

  @Post('refresh/:workspaceId')
  @GuestOrWorkspaceMember()
  @ApiOperation({ summary: 'Refresh an existing guest token (guest or user auth required)' })
  @ApiResponse({
    status: 201,
    description: 'Guest token refreshed',
    schema: { example: 'newJwtTokenString' },
  })
  async refreshGuestToken(
    @Param('workspaceId') workspaceId: string,
    @Body('token') token: string,
  ): Promise<string> {
    if (!token) {
      throw new BadRequestException('Token is required in the request body');
    }
    const result = await this.guestTokensService.refreshToken(token, workspaceId);
    return result;
  }

  // === ADMIN ONLY: TOKEN VALIDATION ===
  @Get('validate/:token')
  @AdminOnly()
  @ApiOperation({ summary: 'Admin: Validate a guest token (debug/ops only)' })
  @ApiResponse({ status: 200, type: GuestTokenDto })
  async validateGuestToken(@Param('token') token: string): Promise<GuestTokenDto> {
    return (await this.guestTokensService.validateToken(token)) as GuestTokenDto;
  }

  // === ADMIN ONLY: LIST ACTIVE TOKENS FOR GUEST WORKSPACE ===
  @Get('workspace/active')
  @AdminOnly()
  @ApiOperation({ summary: 'Admin: List all active guest tokens for the guest workspace' })
  @ApiResponse({ status: 200, type: [GuestTokenDto] })
  async getActiveTokens(): Promise<GuestTokenDto[]> {
    const workspaceId = process.env.GUEST_WORKSPACE_ID || 'guest-demo-workspace-id';
    return (await this.guestTokensService.getActiveTokensForWorkspace(
      workspaceId,
    )) as GuestTokenDto[];
  }

  // === ADMIN ONLY: REVOKE TOKEN ===
  @Delete(':token')
  @AdminOnly()
  @ApiOperation({ summary: 'Admin: Revoke (delete) a guest token' })
  @ApiResponse({ status: 200, description: 'Guest token revoked' })
  async revokeToken(@Param('token') token: string): Promise<{ revoked: boolean }> {
    await this.guestTokensService.revokeToken(token);
    return { revoked: true };
  }
}
