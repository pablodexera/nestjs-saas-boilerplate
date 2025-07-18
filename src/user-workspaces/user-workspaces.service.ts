import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { isEmail } from 'class-validator';

import { PrismaService } from '../prisma/prisma.service';
import { UserWorkspaceEntity } from './user-workspaces.entity';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { UsersService } from '../users/users.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { WorkspaceRole } from '../common/enums/workspace-role.enum';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class UserWorkspacesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly workspacesService: WorkspacesService,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
    private readonly logger: PinoLogger,
  ) {}

  async findByUserId(userId: string): Promise<UserWorkspaceEntity[]> {
    const memberships = await this.prisma.userWorkspace.findMany({
      where: { user_id: userId },
    });
    this.logger.debug('User workspace memberships fetched: %o', {
      userId,
      count: memberships.length,
    });
    return memberships;
  }

  async findByWorkspaceId(workspaceId: string): Promise<UserWorkspaceEntity[]> {
    const members = await this.prisma.userWorkspace.findMany({
      where: { workspace_id: workspaceId },
    });
    this.logger.debug('Workspace members listed: %o', { workspaceId, count: members.length });
    return members;
  }

  async findMembership(userId: string, workspaceId: string): Promise<UserWorkspaceEntity | null> {
    const membership = await this.prisma.userWorkspace.findUnique({
      where: { user_id_workspace_id: { user_id: userId, workspace_id: workspaceId } },
    });
    if (membership) {
      this.logger.info('Membership found', { userId, workspaceId });
    }
    return membership;
  }

  async ensureWorkspaceHasAdmin(workspaceId: string, excludingUserId: string): Promise<void> {
    const adminCount = await this.prisma.userWorkspace.count({
      where: {
        workspace_id: workspaceId,
        status: 'active',
        role: { in: [WorkspaceRole.OWNER, WorkspaceRole.ADMIN] },
        NOT: { user_id: excludingUserId },
      },
    });

    if (adminCount === 0) {
      this.logger.warn('Operation blocked - would leave workspace without admin: %o', {
        workspaceId,
        excludingUserId,
      });
      throw new ForbiddenException('Workspace must have at least one owner or admin');
    }
  }

  async inviteUserToWorkspace(
    inviterId: string | undefined,
    email: string,
    workspaceId: string,
  ): Promise<UserWorkspaceEntity | void> {
    if (!inviterId) {
      throw new Error('Inviter ID is required');
    }
    if (!isEmail(email)) {
      this.logger.warn('Invite failed - invalid email: %o', { email });
      throw new BadRequestException('Invalid email address');
    }

    const inviterMembership = await this.workspacesService.getUserWorkspaceMembership(
      inviterId,
      workspaceId,
    );
    if (
      !inviterMembership ||
      inviterMembership.status !== 'active' ||
      ![WorkspaceRole.OWNER, WorkspaceRole.ADMIN].includes(inviterMembership.role as WorkspaceRole)
    ) {
      this.logger.warn('Invite failed - inviter lacks permission: %o', { inviterId, workspaceId });
      throw new ForbiddenException('Only workspace owners or admins can invite members');
    }
    const inviter = await this.usersService.findById(inviterId);
    const workspace = await this.workspacesService.findById(workspaceId);
    if (!inviter || !workspace) {
      this.logger.warn('Invite failed - missing entity: %o', { inviterId, workspaceId });
      throw new NotFoundException('Inviter or workspace not found');
    }

    let user: UserResponseDto | null = null;
    try {
      user = await this.usersService.findByEmail(email);
    } catch {
      // User does not exist: send platform invite, do not create user or membership
      const adminUser = await this.usersService.findByEmail(process.env.SEED_ADMIN_EMAIL!);
      await this.notificationsService.sendEmail(email, 'platform-invite', {
        inviterName: inviter.full_name || inviter.email,
        appUrl: this.configService.get<string>('app.url'),
        userId: adminUser.id, // always set a valid userId
      });
      this.logger.info('User not found, sent platform invite: %o', { email });
      return;
    }
    const userId = (user as any).id;

    let membership = await this.findMembership(userId, workspaceId);
    if (membership) {
      if (membership.status === 'removed') {
        membership = await this.prisma.userWorkspace.update({
          where: {
            user_id_workspace_id: { user_id: userId, workspace_id: workspaceId },
          },
          data: {
            status: 'pending',
            invited_by: inviterId,
            role: WorkspaceRole.MEMBER,
          },
        });
        this.logger.info('Re-invited previously removed user', {
          userId,
          workspaceId,
          inviterId,
        });
        await this.notificationsService.sendEmail(email, 'workspace-invite', {
          workspaceName: workspace.name,
          inviterName: inviter.full_name || inviter.email,
          userId,
          appUrl: this.configService.get<string>('app.url'),
        });
        return membership || undefined;
      }
      this.logger.warn('Invite failed - user already a member or invited: %o', {
        userId,
        workspaceId,
      });
      throw new BadRequestException('User is already a member or has a pending invite');
    }

    membership = await this.prisma.userWorkspace.create({
      data: {
        user_id: userId,
        workspace_id: workspaceId,
        invited_by: inviterId,
        status: 'pending',
        role: WorkspaceRole.MEMBER,
      },
    });
    this.logger.info('User invited to workspace', { userId, workspaceId, inviterId });

    await this.notificationsService.sendEmail(email, 'workspace-invite', {
      workspaceName: workspace.name,
      inviterName: inviter.full_name || inviter.email,
      userId,
      appUrl: this.configService.get<string>('app.url'),
    });

    return membership as UserWorkspaceEntity;
  }

  async acceptInvite(
    userId: string | undefined,
    workspaceId: string,
  ): Promise<UserWorkspaceEntity> {
    if (!userId) {
      throw new Error('User ID is required');
    }
    const membership = await this.findMembership(userId, workspaceId);
    if (!membership || membership.status !== 'pending') {
      this.logger.warn('Accept invite failed - no pending invite: %o', { userId, workspaceId });
      throw new NotFoundException('No pending invite found');
    }
    const updated = await this.prisma.userWorkspace.update({
      where: { user_id_workspace_id: { user_id: userId, workspace_id: workspaceId } },
      data: { status: 'active', joined_at: new Date() },
    });
    this.logger.info('User accepted workspace invite', { userId, workspaceId });
    return updated as UserWorkspaceEntity;
  }

  async removeMember(
    adminId: string | undefined,
    userId: string,
    workspaceId: string,
  ): Promise<void> {
    if (!userId) {
      throw new Error('User ID is required');
    }
    const membership = await this.findMembership(userId, workspaceId);
    if (!membership || membership.status === 'removed') {
      this.logger.warn('Remove member failed - not a member: %o', { userId, workspaceId, adminId });
      throw new NotFoundException('User is not a member of workspace');
    }
    if ([WorkspaceRole.ADMIN, WorkspaceRole.OWNER].includes(membership.role as WorkspaceRole)) {
      await this.ensureWorkspaceHasAdmin(workspaceId, userId);
    }
    await this.prisma.userWorkspace.update({
      where: { user_id_workspace_id: { user_id: userId, workspace_id: workspaceId } },
      data: { status: 'removed' },
    });
    this.logger.info('User removed from workspace', { userId, workspaceId, adminId });
  }

  async leaveWorkspace(userId: string | undefined, workspaceId: string): Promise<void> {
    if (!userId) {
      throw new Error('User ID is required');
    }
    const membership = await this.findMembership(userId, workspaceId);
    if (!membership || membership.status !== 'active') {
      this.logger.warn('Leave workspace failed - not an active member: %o', {
        userId,
        workspaceId,
      });
      throw new NotFoundException('User is not an active member');
    }
    if ([WorkspaceRole.ADMIN, WorkspaceRole.OWNER].includes(membership.role as WorkspaceRole)) {
      await this.ensureWorkspaceHasAdmin(workspaceId, userId);
    }
    await this.prisma.userWorkspace.update({
      where: { user_id_workspace_id: { user_id: userId, workspace_id: workspaceId } },
      data: { status: 'removed' },
    });
    this.logger.info('User left workspace', { userId, workspaceId });
  }

  async declineInvite(userId: string | undefined, workspaceId: string): Promise<void> {
    if (!userId) {
      throw new Error('User ID is required');
    }
    const membership = await this.findMembership(userId, workspaceId);
    if (!membership || membership.status !== 'pending') {
      this.logger.warn('Decline invite failed - no pending invite: %o', { userId, workspaceId });
      throw new NotFoundException('No pending invite found');
    }
    await this.prisma.userWorkspace.update({
      where: { user_id_workspace_id: { user_id: userId, workspace_id: workspaceId } },
      data: { status: 'removed' },
    });
    this.logger.info('User declined workspace invite', { userId, workspaceId });
  }

  async setStatus(
    userId: string,
    workspaceId: string,
    status: 'active' | 'pending' | 'removed',
  ): Promise<UserWorkspaceEntity> {
    const membership = await this.findMembership(userId, workspaceId);
    if (!membership) {
      this.logger.warn('Set status failed - membership not found: %o', {
        userId,
        workspaceId,
        status,
      });
      throw new NotFoundException('Membership not found');
    }
    const updated = await this.prisma.userWorkspace.update({
      where: { user_id_workspace_id: { user_id: userId, workspace_id: workspaceId } },
      data: {
        status,
        ...(status === 'active' ? { joined_at: new Date() } : {}),
      },
    });
    this.logger.info('Membership status updated', { userId, workspaceId, status });
    return updated;
  }

  async getMembersWithStatus(
    workspaceId: string,
    status: 'active' | 'pending' | 'removed' | null = null,
  ): Promise<UserWorkspaceEntity[]> {
    const where: any = { workspace_id: workspaceId };
    if (status) where.status = status;
    const members = await this.prisma.userWorkspace.findMany({ where });
    this.logger.info('Workspace members fetched by status', {
      workspaceId,
      status,
      count: members.length,
    });
    return members;
  }

  async updateMemberRole(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole,
    actorId: string | undefined,
  ): Promise<UserWorkspaceEntity> {
    if (!workspaceId) throw new BadRequestException('Workspace ID is required');
    if (!userId) throw new BadRequestException('User ID is required');
    if (!actorId) {
      throw new Error('Actor ID is required');
    }
    const actorMembership = await this.findMembership(actorId, workspaceId);
    if (
      !actorMembership ||
      actorMembership.status !== 'active' ||
      ![WorkspaceRole.OWNER, WorkspaceRole.ADMIN].includes(actorMembership.role as WorkspaceRole)
    ) {
      this.logger.warn('Role update forbidden - actor lacks permission: %o', {
        workspaceId,
        actorId,
      });
      throw new ForbiddenException('Only workspace owners or admins can update roles');
    }

    const membership = await this.findMembership(userId, workspaceId);
    if (!membership || membership.status !== 'active') {
      this.logger.warn('Role update failed - membership not found: %o', { workspaceId, userId });
      throw new NotFoundException('User is not an active member of workspace');
    }

    if (
      [WorkspaceRole.ADMIN, WorkspaceRole.OWNER].includes(membership.role as WorkspaceRole) &&
      ![WorkspaceRole.ADMIN, WorkspaceRole.OWNER].includes(role as WorkspaceRole)
    ) {
      const adminCount = await this.prisma.userWorkspace.count({
        where: {
          workspace_id: workspaceId,
          status: 'active',
          role: { in: [WorkspaceRole.ADMIN, WorkspaceRole.OWNER] },
        },
      });

      if (adminCount <= 1) {
        this.logger.warn('Role update failed - last admin/owner demotion prevented: %o', {
          workspaceId,
          userId,
        });
        throw new BadRequestException('Cannot demote the last workspace admin or owner');
      }
    }

    const updated = await this.prisma.userWorkspace.update({
      where: { user_id_workspace_id: { user_id: userId, workspace_id: workspaceId } },
      data: { role },
    });

    this.logger.info('Workspace member role updated', {
      workspaceId,
      userId,
      role,
      actorId,
    });

    return updated;
  }
}
