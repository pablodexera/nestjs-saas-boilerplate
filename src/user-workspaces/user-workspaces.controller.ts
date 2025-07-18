import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiBody } from '@nestjs/swagger';
import { isEmail } from 'class-validator';

import { WorkspaceAdmin } from '../common/decorators/workspace-admin.decorator';
import { Authenticated } from '../common/decorators/authenticated.decorator';
import { UserWorkspacesService } from './user-workspaces.service';
import { UserWorkspaceEntity } from './user-workspaces.entity';
import { WorkspaceRole } from '../common/enums/workspace-role.enum';

@ApiTags('Workspace Memberships')
@ApiBearerAuth()
@Controller('user-workspaces/:workspaceId/members')
export class UserWorkspacesController {
  constructor(
    private readonly userWorkspacesService: UserWorkspacesService,
    private readonly logger: Logger,
  ) {}

  /**
   * List all members in a workspace (admin‑only).
   */
  @Get()
  @WorkspaceAdmin()
  @ApiOperation({ summary: 'List all members of a workspace (Workspace admin only)' })
  @ApiResponse({ status: 200, type: [UserWorkspaceEntity] })
  async listMembers(
    @Param('workspaceId') workspaceId: string,
    @Req() req: Request,
  ): Promise<UserWorkspaceEntity[]> {
    const members = await this.userWorkspacesService.findByWorkspaceId(workspaceId);
    this.logger.log('Workspace members listed: %o', {
      workspaceId,
      adminId: req.user?.id,
      count: members.length,
    });
    return members;
  }

  /**
   * Invite a user to the workspace (admin‑only).
   */
  @Post()
  @ApiBody({
    schema: {
      type: 'object',
      properties: { email: { type: 'string', format: 'email' } },
      required: ['email'],
    },
  })
  @WorkspaceAdmin()
  @ApiOperation({ summary: 'Invite a user to workspace (Workspace admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Returns membership if user exists, or empty object if platform invite sent.',
  })
  async inviteMember(
    @Param('workspaceId') workspaceId: string,
    @Body('email') email: string,
    @Req() req: Request,
  ): Promise<UserWorkspaceEntity | Record<string, never>> {
    if (!isEmail(email)) {
      throw new BadRequestException('Invalid email address');
    }

    const membership = await this.userWorkspacesService.inviteUserToWorkspace(
      req.user?.id,
      email,
      workspaceId,
    );

    this.logger.log('User invited to workspace: %o', {
      workspaceId,
      email,
      inviterId: req.user?.id,
    });

    return membership || {};
  }

  /**
   * Leave the workspace (authenticated user).
   * Placed **before** the :userId route to avoid path‑matching collisions.
   */
  @Delete('leave')
  @Authenticated()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Leave workspace (User only)' })
  @ApiResponse({ status: 204, description: 'Left workspace' })
  async leaveWorkspace(
    @Param('workspaceId') workspaceId: string,
    @Req() req: Request,
  ): Promise<void> {
    await this.userWorkspacesService.leaveWorkspace(req.user?.id, workspaceId);
    this.logger.log('Workspace left by user: %o', {
      workspaceId,
      userId: req.user?.id,
    });
  }

  /**
   * Remove another member (admin‑only). Must come **after** the static `leave` route.
   */
  @Delete(':userId')
  @WorkspaceAdmin()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove member from workspace (Workspace admin only)' })
  @ApiResponse({ status: 204, description: 'Member removed' })
  async removeMember(
    @Param('workspaceId') workspaceId: string,
    @Param('userId') userId: string,
    @Req() req: Request,
  ): Promise<void> {
    await this.userWorkspacesService.removeMember(req.user?.id, userId, workspaceId);
    this.logger.log('Member removed from workspace: %o', {
      workspaceId,
      userId,
      adminId: req.user?.id,
    });
  }

  /**
   * Accept workspace invite (authenticated user).
   */
  @Post('accept')
  @Authenticated()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept workspace invite (User only)' })
  @ApiResponse({ status: 200, type: UserWorkspaceEntity })
  async acceptInvite(
    @Param('workspaceId') workspaceId: string,
    @Req() req: Request,
  ): Promise<UserWorkspaceEntity> {
    const membership = await this.userWorkspacesService.acceptInvite(req.user?.id, workspaceId);
    this.logger.log('Workspace invite accepted: %o', {
      workspaceId,
      userId: req.user?.id,
    });
    return membership;
  }

  /**
   * Update a member's role (admin‑only).
   */
  @Patch(':userId/role')
  @WorkspaceAdmin()
  @ApiOperation({ summary: 'Update member role (Workspace admin only)' })
  @ApiResponse({ status: 200, type: UserWorkspaceEntity })
  async updateMemberRole(
    @Param('workspaceId') workspaceId: string,
    @Param('userId') userId: string,
    @Body('role') role: WorkspaceRole,
    @Req() req: Request,
  ): Promise<UserWorkspaceEntity> {
    const membership = await this.userWorkspacesService.updateMemberRole(
      workspaceId,
      userId,
      role,
      req.user?.id,
    );
    this.logger.log('Workspace member role updated: %o', {
      workspaceId,
      userId,
      role,
      actorId: req.user?.id,
    });
    return membership;
  }

  /**
   * Decline workspace invite (authenticated user).
   */
  @Post('decline')
  @Authenticated()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Decline workspace invite (User only)' })
  @ApiResponse({ status: 204, description: 'Invite declined' })
  async declineInvite(
    @Param('workspaceId') workspaceId: string,
    @Req() req: Request,
  ): Promise<void> {
    await this.userWorkspacesService.declineInvite(req.user?.id, workspaceId);
    this.logger.log('Workspace invite declined: %o', {
      workspaceId,
      userId: req.user?.id,
    });
  }
}
