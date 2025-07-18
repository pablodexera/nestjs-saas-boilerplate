import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PinoLogger } from 'nestjs-pino';
import { Request } from 'express';

import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { WorkspaceResponseDto } from './dto/workspace-response.dto';
import { AdminOnly } from '../common/decorators/admin-only.decorator';
import { WorkspaceAdmin } from '../common/decorators/workspace-admin.decorator';
import { WorkspaceMember } from '../common/decorators/workspace-member.decorator';
import { Authenticated } from '../common/decorators/authenticated.decorator';

@ApiTags('Workspaces')
@ApiBearerAuth()
@Controller('workspaces')
export class WorkspacesController {
  constructor(
    private readonly workspacesService: WorkspacesService,
    private readonly logger: PinoLogger,
  ) {}

  @Post()
  @AdminOnly()
  @ApiOperation({ summary: 'Create workspace (Admin only)' })
  @ApiResponse({ status: 201, type: WorkspaceResponseDto })
  async create(
    @Body() dto: CreateWorkspaceDto,
    @Req() req: Request,
  ): Promise<WorkspaceResponseDto> {
    // Admin must specify owner_id
    if (!dto.owner_id) {
      throw new BadRequestException('Admin must specify owner_id');
    }
    try {
      const ws = await this.workspacesService.create(dto, dto.owner_id);
      this.logger.info('Workspace created', { workspaceId: ws.id, actorId: req.user?.id });
      return ws;
    } catch (err) {
      const error = err as Error;
      this.logger.warn('Workspace creation failed: %o', { error: error.message, body: dto });
      if (error.name === 'BadRequestException') throw err;
      if (error.name === 'ValidationError') {
        throw new BadRequestException('Invalid workspace payload: ' + error.message);
      }
      throw new BadRequestException('Invalid workspace payload');
    }
  }

  @Post('user')
  @Authenticated()
  @ApiOperation({ summary: 'Create workspace (User)' })
  @ApiResponse({ status: 201, type: WorkspaceResponseDto })
  async createForUser(
    @Body() dto: CreateWorkspaceDto,
    @Req() req: Request,
  ): Promise<WorkspaceResponseDto> {
    // Users cannot set owner_id to anyone but themselves
    if ('owner_id' in dto && dto.owner_id !== req.user?.id) {
      throw new BadRequestException('You cannot set owner_id');
    }
    if (!req.user?.id) {
      throw new BadRequestException('User ID is required');
    }
    dto.owner_id = req.user.id;
    try {
      const ws = await this.workspacesService.create(dto, req.user?.id);
      this.logger.info('User created workspace', { workspaceId: ws.id, userId: req.user?.id });
      return ws;
    } catch (err) {
      const error = err as Error;
      this.logger.warn('User workspace creation failed: %o', { error: error.message, body: dto });
      if (error.name === 'BadRequestException') throw err;
      if (error.name === 'ValidationError') {
        throw new BadRequestException('Invalid workspace payload: ' + error.message);
      }
      throw new BadRequestException('Invalid workspace payload');
    }
  }

  @Get()
  @AdminOnly()
  @ApiOperation({ summary: 'List all workspaces (Admin only)' })
  @ApiResponse({ status: 200, type: [WorkspaceResponseDto] })
  async findAll(): Promise<WorkspaceResponseDto[]> {
    const list = await this.workspacesService.findAll();
    this.logger.info('Listing all workspaces', { count: list.length });
    return list;
  }

  @Get('user')
  @Authenticated()
  @ApiOperation({ summary: 'List your workspaces' })
  @ApiResponse({ status: 200, type: [WorkspaceResponseDto] })
  async findMine(@Req() req: Request): Promise<WorkspaceResponseDto[]> {
    const list = await this.workspacesService.findAllForUser(req.user?.id);
    this.logger.info('User listing own workspaces', { userId: req.user?.id, count: list.length });
    return list;
  }

  @Get('invites')
  @Authenticated()
  async getPendingInvites(@Req() req: Request) {
    if (!req.user || !req.user.id) {
      throw new Error('User not authenticated');
    }
    const all = await this.workspacesService.findAllUserWorkspacesForUser(req.user.id);
    return all.filter((m) => m.status === 'pending');
  }

  @Get('slug-available/:slug')
  @Authenticated()
  @ApiOperation({ summary: 'Check if a workspace slug is available' })
  @ApiResponse({ status: 200, schema: { example: { available: true } } })
  async isSlugAvailable(@Param('slug') slug: string): Promise<{ available: boolean }> {
    const exists = await this.workspacesService['prisma'].workspace.findUnique({ where: { slug } });
    return { available: !exists };
  }

  @Get(':workspaceId')
  @WorkspaceMember()
  @ApiOperation({ summary: 'Get workspace by id (Workspace member only)' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, type: WorkspaceResponseDto })
  async findOne(
    @Param('workspaceId') workspaceId: string,
    @Req() req: Request,
  ): Promise<WorkspaceResponseDto> {
    const ws = await this.workspacesService.findById(workspaceId);
    this.logger.info('Fetched workspace', { workspaceId, userId: req.user?.id });
    return ws;
  }

  @Patch(':workspaceId')
  @WorkspaceAdmin()
  @ApiOperation({ summary: 'Update workspace (Workspace admin only)' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, type: WorkspaceResponseDto })
  async update(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: Partial<CreateWorkspaceDto>,
    @Req() req: Request,
  ): Promise<WorkspaceResponseDto> {
    const ws = await this.workspacesService.update(workspaceId, dto, req.user?.id);
    this.logger.info('Workspace updated', { workspaceId, actorId: req.user?.id });
    return ws;
  }

  @Delete(':workspaceId')
  @WorkspaceAdmin()
  @ApiOperation({ summary: 'Delete workspace (Workspace admin only)' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Workspace deleted' })
  async remove(
    @Param('workspaceId') workspaceId: string,
    @Req() req: Request,
  ): Promise<{ deleted: boolean }> {
    const result = await this.workspacesService.remove(workspaceId, req.user?.id);
    this.logger.info('Workspace deleted', { workspaceId, actorId: req.user?.id });
    return result;
  }
}
