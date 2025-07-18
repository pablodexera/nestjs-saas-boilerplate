import { Controller, Get, Post, Body, Param, Query, Req } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { Request } from 'express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

import { AuditEventsService } from './audit-events.service';
import { AuditEventDto } from './dto/audit-event.dto';
import { AdminOnly } from '../common/decorators/admin-only.decorator';
import { WorkspaceMember } from '../common/decorators/workspace-member.decorator';
import { Authenticated } from '../common/decorators/authenticated.decorator';

@ApiTags('Audit Events')
@ApiBearerAuth()
@Controller('audit-events')
export class AuditEventsController {
  constructor(
    private readonly auditEventsService: AuditEventsService,
    private readonly logger: PinoLogger,
  ) {}

  /** Create a new audit event */
  @Post()
  @AdminOnly()
  @ApiOperation({ summary: 'Admin: Create a new audit event' })
  @ApiResponse({ status: 201, type: AuditEventDto })
  async createEvent(@Body() dto: AuditEventDto): Promise<AuditEventDto> {
    this.logger.info('Admin creating audit event', { eventType: dto.eventType });
    return this.auditEventsService.create(dto);
  }

  /** Admin: list all audit events */
  @Get('admin/all')
  @AdminOnly()
  @ApiOperation({ summary: 'Admin: List all audit events' })
  @ApiResponse({ status: 200, type: [AuditEventDto] })
  async getAllEvents(): Promise<AuditEventDto[]> {
    this.logger.info('Admin fetching all audit events');
    return this.auditEventsService.findAll();
  }

  /** User: list own audit events */
  @Get('user')
  @Authenticated()
  @ApiOperation({ summary: 'User: List your audit events' })
  @ApiResponse({ status: 200, type: [AuditEventDto] })
  async getUserEvents(@Req() req: Request): Promise<AuditEventDto[]> {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User ID not found');
    }
    this.logger.info('User fetching audit events', { actorId: userId });
    return this.auditEventsService.findByActor(userId);
  }

  /** Workspace Member: list workspace audit events */
  @Get('workspace/:workspaceId')
  @WorkspaceMember()
  @ApiOperation({ summary: 'Workspace Member: List audit events for a workspace' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID', type: String })
  @ApiResponse({ status: 200, type: [AuditEventDto] })
  async getWorkspaceEvents(@Param('workspaceId') workspaceId: string): Promise<AuditEventDto[]> {
    this.logger.info('Workspace member fetching audit events', { workspaceId });
    return this.auditEventsService.findByWorkspace(workspaceId);
  }

  /** Admin: query audit events by filters */
  @Get()
  @AdminOnly()
  @ApiQuery({ name: 'eventType', required: false, type: String })
  @ApiQuery({ name: 'actorId', required: false, type: String })
  @ApiQuery({ name: 'workspaceId', required: false, type: String })
  @ApiOperation({ summary: 'Admin: Query audit events by filters' })
  @ApiResponse({ status: 200, type: [AuditEventDto] })
  async queryEvents(
    @Query('eventType') eventType?: string,
    @Query('actorId') actorId?: string,
    @Query('workspaceId') workspaceId?: string,
  ): Promise<AuditEventDto[]> {
    this.logger.info('Admin querying audit events', { eventType, actorId, workspaceId });
    return this.auditEventsService.query({ eventType, actorId, workspaceId });
  }
}
