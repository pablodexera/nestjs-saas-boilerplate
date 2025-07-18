// src/workspaces/workspaces.service.ts

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { WorkspaceResponseDto } from './dto/workspace-response.dto';
import { WorkspaceRole } from '../common/enums/workspace-role.enum';
import { slugify } from '../common/utils/string.util';

function randomAlphanumeric(length = 5): string {
  return Math.random()
    .toString(36)
    .substring(2, 2 + length);
}

@Injectable()
export class WorkspacesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {}

  private async generateUniqueSlug(base: string): Promise<string> {
    let slug = slugify(base);
    const originalSlug = slug;
    let attempt = 0;
    while (await this.prisma.workspace.findUnique({ where: { slug } })) {
      slug = `${originalSlug}-${randomAlphanumeric(5)}`;
      attempt++;
      if (attempt > 10) throw new Error('Could not generate unique slug after 10 attempts');
    }
    return slug;
  }

  async addUserToWorkspace(
    userId: string,
    workspaceId: string,
    opts: { invitedBy?: string; status?: string; role?: WorkspaceRole } = {},
  ) {
    if (!userId) throw new BadRequestException('User ID is required');
    if (!workspaceId) throw new BadRequestException('Workspace ID is required');
    const membership = await this.prisma.userWorkspace.upsert({
      where: { user_id_workspace_id: { user_id: userId, workspace_id: workspaceId } },
      update: {
        status: opts.status ?? 'active',
        invited_by: opts.invitedBy ?? null,
        role: opts.role ?? WorkspaceRole.MEMBER,
      },
      create: {
        user_id: userId,
        workspace_id: workspaceId,
        invited_by: opts.invitedBy ?? null,
        status: opts.status ?? 'active',
        role: opts.role ?? WorkspaceRole.MEMBER,
        joined_at: new Date(),
      },
    });
    this.logger.info('User added to workspace', { userId, workspaceId });
    return membership;
  }

  async create(
    data: CreateWorkspaceDto,
    userId: string | undefined,
  ): Promise<WorkspaceResponseDto> {
    // Use provided slug, but ensure uniqueness by incrementing if needed
    const slug = await this.generateUniqueSlug(data.slug);
    const workspace = await this.prisma.workspace.create({
      data: {
        ...data,
        slug,
        owner_id: data.owner_id || userId,
      },
    });

    // Link creator as member of the workspace
    if (userId) {
      if (!workspace.id) throw new BadRequestException('Workspace ID is required');
      await this.prisma.userWorkspace.upsert({
        where: { user_id_workspace_id: { user_id: userId, workspace_id: workspace.id } },
        update: {},
        create: {
          user_id: userId,
          workspace_id: workspace.id,
          status: 'active',
          role: workspace.owner_id === userId ? WorkspaceRole.OWNER : WorkspaceRole.MEMBER,
          joined_at: new Date(),
        },
      });
    }

    // Always create a default free subscription for the workspace
    // NOTE: Tests must clean up the subscription after!
    await this.prisma.subscription.create({
      data: {
        workspace_id: workspace.id,
        plan: 'free',
        billing_period: 'monthly',
        status: 'active',
        current_period_start: new Date(),
        current_period_end: new Date(Date.now() + 10 * 365 * 86_400_000),
        trial_end: null,
        seats: 1,
        record_limit: 1000,
        stripe_id: null,
      },
    });

    this.logger.info('Workspace and default subscription created', {
      workspaceId: workspace.id,
      ownerId: workspace.owner_id,
      createdBy: userId,
    });

    return this.toResponseDto(workspace);
  }

  async findById(workspaceId: string): Promise<WorkspaceResponseDto> {
    const workspace = await this.prisma.workspace.findFirst({
      where: { id: workspaceId, deleted_at: null },
    });
    if (!workspace) {
      this.logger.warn('Workspace not found: %o', { workspaceId });
      throw new NotFoundException('Workspace not found');
    }
    return this.toResponseDto(workspace);
  }

  async findByIdWithSubscription(workspaceId: string) {
    const workspace = await this.prisma.workspace.findFirst({
      where: { id: workspaceId, deleted_at: null },
      include: { subscriptions: true },
    });
    if (!workspace) {
      this.logger.warn('Workspace not found: %o', { workspaceId });
      throw new NotFoundException('Workspace not found');
    }
    return {
      ...this.toResponseDto(workspace),
      subscriptions: workspace.subscriptions,
    };
  }

  async findAll(): Promise<WorkspaceResponseDto[]> {
    const workspaces = await this.prisma.workspace.findMany({
      where: { deleted_at: null },
    });
    this.logger.info(`Queried all workspaces: count=${workspaces.length}`);
    return workspaces.map((ws: any) => this.toResponseDto(ws));
  }

  async findAllForUser(userId: string | undefined): Promise<WorkspaceResponseDto[]> {
    const [user, memberships] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.userWorkspace.findMany({
        where: { user_id: userId, status: 'active', workspace: { deleted_at: null } },
        include: { workspace: true },
      }),
    ]);

    const primaryId = user?.primary_workspace_id;
    return memberships.map((m: any) =>
      this.toResponseDto(m.workspace, {
        isPrimary: m.workspace_id === primaryId,
      }),
    );
  }

  async findAllUserWorkspacesForUser(userId: string) {
    return this.prisma.userWorkspace.findMany({
      where: { user_id: userId },
    });
  }

  async update(
    workspaceId: string,
    data: Partial<CreateWorkspaceDto>,
    actorId: string | undefined,
  ): Promise<WorkspaceResponseDto> {
    if (!workspaceId) throw new BadRequestException('Workspace ID is required');

    if (data.slug !== undefined && data.slug.trim() === '') {
      throw new BadRequestException('Slug must not be empty');
    }
    // Handle slug uniqueness if slug is being updated
    const updateData = { ...data };
    if (data.slug !== undefined) {
      updateData.slug = await this.generateUniqueSlug(data.slug);
    }

    const workspace = await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: updateData,
    });
    this.logger.info('Workspace updated', { workspaceId, updatedBy: actorId });
    return this.toResponseDto(workspace);
  }

  async remove(workspaceId: string, userId: string | undefined): Promise<{ deleted: boolean }> {
    if (!workspaceId) throw new BadRequestException('Workspace ID is required');
    // Check how many workspaces the user belongs to
    const memberships = await this.prisma.userWorkspace.findMany({
      where: { user_id: userId, status: 'active' },
    });

    if (memberships.length <= 1) {
      this.logger.warn('Attempt to delete last workspace: %o', { userId, workspaceId });
      throw new BadRequestException(
        'Cannot delete your only workspace. You must have at least one workspace.',
      );
    }

    // Check if deleting user's primary workspace
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user && user.primary_workspace_id === workspaceId) {
      this.logger.warn('Attempt to delete primary workspace without reassignment: %o', {
        userId,
        workspaceId,
      });
      throw new ForbiddenException('Cannot delete your primary workspace without reassigning it.');
    }

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { deleted_at: new Date() },
    });
    this.logger.info('Workspace soft-deleted', {
      workspaceId,
      deletedBy: userId,
    });

    return { deleted: true };
  }

  async getUserWorkspaceMembership(userId: string, workspaceId: string) {
    return this.prisma.userWorkspace.findUnique({
      where: { user_id_workspace_id: { user_id: userId, workspace_id: workspaceId } },
    });
  }

  private toResponseDto(
    workspace: {
      id: string;
      name: string;
      slug: string;
      created_at: Date;
      updated_at: Date;
      deleted_at: Date | null;
      owner_id: string | null;
      settings_json: any;
    },
    opts: { isPrimary?: boolean } = {},
  ): WorkspaceResponseDto {
    return {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      created_at: workspace.created_at,
      updated_at: workspace.updated_at,
      deleted_at: workspace.deleted_at ?? null,
      owner_id: workspace.owner_id,
      settings_json: workspace.settings_json,
      is_primary: opts.isPrimary,
    };
  }
}
